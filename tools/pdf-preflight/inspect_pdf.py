import json
import sys
from io import BytesIO
from pathlib import Path


def embedded_profiles(pdf):
    from PIL import ImageCms
    from pikepdf import Array, Dictionary, Name, Stream

    def description(profile):
        try:
            data = profile.read_bytes()
            name = ImageCms.getProfileDescription(ImageCms.getOpenProfile(BytesIO(data)))
            return name.strip()[:160] or "Без названия"
        except (ImageCms.PyCMSError, ValueError, OSError):
            return "Профиль не читается"

    # Indirect objects are visited separately through pdf.objects.
    pending = list(pdf.objects)
    profiles = {}
    while pending:
        obj = pending.pop()
        if isinstance(obj, Array):
            if len(obj) == 2 and obj[0] == Name.ICCBased and isinstance(obj[1], Stream):
                profiles[obj[1].objgen] = obj[1]
            children = obj
        elif isinstance(obj, (Dictionary, Stream)):
            children = obj.values()
        else:
            continue
        pending.extend(
            item for item in children
            if isinstance(item, (Array, Dictionary)) and not item.is_indirect
        )

    intents = []
    for intent in pdf.Root.get("/OutputIntents", []):
        profile = intent.get("/DestOutputProfile")
        embedded = isinstance(profile, Stream)
        if embedded:
            profiles[profile.objgen] = profile
        label = intent.get("/OutputConditionIdentifier") or intent.get("/Info") or "Без названия"
        intents.append({"name": str(label)[:160], "embedded": embedded})

    return {
        "profiles": [
            {"name": description(profile), "channels": str(profile.get("/N", ""))[:8]}
            for profile in list(profiles.values())[:30]
        ],
        "profileCount": len(profiles),
        "intents": intents[:30],
        "intentCount": len(intents),
    }


def inspect(path):
    from pikepdf import Pdf
    from print_color_preflight.pdf import inspect_pdf

    with Pdf.open(path) as pdf:
        if pdf.is_encrypted:
            return {"error": "encrypted"}
        if len(pdf.pages) > 250:
            return {"error": "pages"}
        profile_report = embedded_profiles(pdf)

    report = inspect_pdf(path)
    return {
        **profile_report,
        "pages": report.page_count,
        "spaces": sorted(space[:80] for space in report.color_spaces)[:50],
        "spotColors": sorted(color[:120] for color in report.spot_colors)[:50],
        "transparency": report.has_transparency,
        "overprint": report.has_overprint,
        "findings": sorted({finding.code for finding in report.findings}),
    }


def main():
    if sys.platform.startswith("linux"):
        import resource

        resource.setrlimit(resource.RLIMIT_AS, (512 * 1024**2, 512 * 1024**2))
        resource.setrlimit(resource.RLIMIT_CPU, (10, 12))
        resource.setrlimit(resource.RLIMIT_CORE, (0, 0))

    from pikepdf import PasswordError, PdfError
    from print_color_preflight.pdf import PdfInspectionError

    try:
        result = inspect(Path(sys.argv[1]))
    except PasswordError:
        result = {"error": "encrypted"}
    except (PdfError, PdfInspectionError, ValueError, TypeError, AttributeError, RecursionError):
        result = {"error": "invalid"}
    except MemoryError:
        result = {"error": "limit"}
    print(json.dumps(result))


if __name__ == "__main__":
    main()
