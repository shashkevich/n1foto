<section class="py-5 text-center container">
    <? foreach ($title_arr as $key => $value) {
        echo '<a class="badge rounded-pill bg-light text-light-gray m-1" href="' . $key . '" role="button">' . $title_arr[$key]['name'] . '</a>';
    } ?>
</section>

<footer class="footer mt-auto py-1">
    <div class="container">
        <div class="row justify-content-center">
            <div class="col-lg-2 text-center d-flex">
                <iframe src="https://yandex.ru/sprav/widget/rating-badge/1307657468?type=rating" width="150" height="50" frameborder="0"></iframe>
            </div>
            <div class="col-lg-3 text-center m-auto">
                <small>Фотосалон №1 2015 - <?php echo date("Y"); ?></small>
            </div>

            <div class="col-lg-5 text-center m-auto">
                <small>Московская область, г. Серпухов, ул. Ворошилова, 133/16. </small>
                <!-- <a href="https://vk.com/serpfoto" target="_blank"><i class="fa fa-vk"></i></a>
                    <a href="https://www.instagram.com/serpfoto/" target="_blank"><i class="fa fa-instagram"></i></a></small> -->
            </div>
            <div class="col-lg-2 m-auto"><small>+7-926-959-29-30</small></div>

        </div>
    </div>


    <script async="" src="//www.google-analytics.com/analytics.js"></script>
    <script type="text/javascript" async="" src="https://mc.yandex.ru/metrika/watch.js"></script>
    <script src="js/jquery-1.7.2.min.js"></script>
    <script src="/js/gallery.js"></script>

    <!-- Yandex.Metrika informer -->
    <a href="https://metrika.yandex.ru/stat/?id=70007377&amp;from=informer" target="_blank" rel="nofollow"><img src="https://informer.yandex.ru/informer/70007377/3_1_FFFFFFFF_EFEFEFFF_0_pageviews" style="width:88px; height:31px; border:0;position: fixed;bottom: 0px" alt="Яндекс.Метрика" title="Яндекс.Метрика: данные за сегодня (просмотры, визиты и уникальные посетители)" class="ym-advanced-informer" data-cid="70007377" data-lang="ru" /></a>
    <!-- /Yandex.Metrika informer -->

    <!-- Yandex.Metrika counter -->
    <script type="text/javascript">
        (function(m, e, t, r, i, k, a) {
            m[i] = m[i] || function() {
                (m[i].a = m[i].a || []).push(arguments)
            };
            m[i].l = 1 * new Date();
            k = e.createElement(t), a = e.getElementsByTagName(t)[0], k.async = 1, k.src = r, a.parentNode.insertBefore(k, a)
        })
        (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

        ym(70007377, "init", {
            clickmap: true,
            trackLinks: true,
            accurateTrackBounce: true,
            webvisor: true
        });
    </script>
    <noscript>
        <div><img src="https://mc.yandex.ru/watch/70007377" style="position:absolute; left:-9999px;" alt="" /></div>
    </noscript>
    <!-- /Yandex.Metrika counter -->

</footer>

<!-- BEGIN JIVOSITE CODE {literal} -->
<script type='text/javascript'>
(function(){ var widget_id = 'uvWyYCRMDf';var d=document;var w=window;function l(){
var s = document.createElement('script'); s.type = 'text/javascript'; s.async = true; s.src = '//code.jivosite.com/script/widget/'+widget_id; var ss = document.getElementsByTagName('script')[0]; ss.parentNode.insertBefore(s, ss);}if(d.readyState=='complete'){l();}else{if(w.attachEvent){w.attachEvent('onload',l);}else{w.addEventListener('load',l,false);}}})();</script>
<!-- {/literal} END JIVOSITE CODE -->

<script src="node_modules/bootstrap/dist/js/bootstrap.bundle.js"></script>
<script src="js/nav-builder.js"></script>