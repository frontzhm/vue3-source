// @ts-nocheck
const defaultOptions = {
    //缩放的比例
    scale: 1.0,
    //旋转的角度
    deg: 0,
    layerImage: null,
    hint: null,
    img: null,
    mod: null,
    isListenWheel: false,
    startZoom: 1,
    isClickShadeClose: true,
    colorMask: 'rgba(0,0,0,.7)',
    hasCloseBox: true,
    hasActionBox: true,
    hasAnimateWhenIsImgEl: false,
}
function previewImage(urlOrImgEl, options = {}) {
    options = { ...defaultOptions, ...options }
    //缩放的比例
    // scale: 1.0,
    // //旋转的角度
    // deg: 0,
    // layerImage: null,
    // hint: null,
    // img: null,
    // mod: null,
    let scale = 1.0; // 缩放的比例
    let deg = 0; // 旋转的角度
    let layerImage = null;
    let hint = null;
    let imgMiddle = null;
    let mod = null;

    //图片的高度和宽度
    let imgWidth
    let imgHeight

    popImg(urlOrImgEl, options.hasAnimateWhenIsImgEl);

    function popImg(urlOrImgEl, hasAnimateWhenIsImgEl = false) {

        let box = document.getElementById("yyz-img-zoom");
        box && box.remove();
        layerImage = createZoomBox(options.isClickShadeClose)
        document.body.appendChild(layerImage);
        //要延时一点点时间
        setTimeout(function () {
            layerImage.style.background = options.colorMask;
        }, 1);

        // 比例放大多少的toast
        hint = createHint()
        layerImage.appendChild(hint);

        // 中间的图片
        imgMiddle = createImg(urlOrImgEl, hasAnimateWhenIsImgEl, options)
        layerImage.appendChild(imgMiddle);

        // 关闭和中间放大缩小旋转 操作层
        layerAction = createMod(options)
        //要延时一点点时间 显示 layerAction
        setTimeout(() => document.body.appendChild(layerAction), 250);
        options.isListenWheel = true;

    }

    function createZoomBox(isClickShadeClose = true) {

        const zoomBoxEl = document.createElement('div'); //1、创建元素
        zoomBoxEl.id = "yyz-img-zoom";   //id
        zoomBoxEl.style.cssText = `
        width: 100%;
        height: 100vh;
        position: fixed;
        left: 0;
        top: 0;
        background: rgba(0,0,0,0);
        transition: background 0.5s;
        z-index: 1001;
        display: flex;
        justify-content: center;
        align-items: center;
    `

        isClickShadeClose && zoomBoxEl.addEventListener('click', close);
        const { handleTouchStart, handleTouchMove, handleTouchEnd } = handleTouch()
        //手势开始
        zoomBoxEl.addEventListener('touchstart', (event) => handleTouchStart(event));
        // 手势移动
        zoomBoxEl.addEventListener('touchmove', (event) => handleTouchMove(event, { sizeCallback, hintPopup, }));
        // 手势结束
        zoomBoxEl.addEventListener('touchend', (event) => handleTouchEnd(event));

        return zoomBoxEl
    }
    function handleTouch() {

        //开始的移动的坐标
        let startX;
        let startY;
        //开始的两个触点的初始距离 - 已经旋转的角度
        let startDst = 1;
        //开始的两个触点的初始角度  / 已经缩放比例
        let startDeg = 0;
        //开始img的top和left
        let startTop = 0;
        let startLeft = 0;
        //开始的宽高
        let startHeigh;
        let startWidth;
        //计算两触点 中点 在图片上的比例
        let startCentreY;
        let startCentreX;
        //开始的两个触点的中点
        let startZhong; //格式 {x: , y: }
        /**  辅助方法  */
        function handleTouchStart(event) {
            const img = imgMiddle
            if (event.touches.length >= 2) {
                //计算一下两个触点的初始角度 - 已经旋转的角度
                startDeg = getDeg(event.touches[0], event.touches[1]) - deg;
                //计算一下两个触点的初始距离 / 已经缩放比例
                startDst = getDst(event.touches[0], event.touches[1]) / scale;

                startTop = img.offsetTop;
                startLeft = img.offsetLeft;
                //获取两触点的中点
                startZhong = getZhong(event.touches[0], event.touches[1]);

                //开始的宽高
                startHeigh = scale * imgHeight;
                startWidth = scale * imgWidth;

                //计算两触点 中点 在图片上的比例
                startCentreY = (startZhong.y - startTop) / startHeigh;
                startCentreX = (startZhong.x - startLeft) / startWidth;
            } else if (event.touches.length == 1) {
                startX = event.touches[0].clientX;
                startY = event.touches[0].clientY;
                startTop = img.offsetTop;
                startLeft = img.offsetLeft;
            }
            //阻止浏览器默认行为
            event.preventDefault();
        }
        function handleTouchMove(event, { sizeCallback, hintPopup }) {
            const img = imgMiddle
            //旋转 
            let canRotate = false;

            if (event.touches.length >= 2) {
                // 计算当前两个触点的距离
                let currentDst = getDst(event.touches[0], event.touches[1]);
                let currentZhong = getZhong(event.touches[0], event.touches[1]);
                // 计算当前两个触点的距离 和 两个触点的初始距离 的 比例,最小值是0.1
                scale = Math.max(currentDst / startDst, 0.1);
                // 回调 
                sizeCallback && sizeCallback(scale);
                // 弹出提示
                hintPopup(Math.round(scale * 100) + "%");

                let newW = scale * imgWidth;
                let newH = scale * imgHeight;
                //按照比例进行缩放
                img.style.width = newW + 'px';
                img.style.height = newH + 'px';

                //中点的坐标 移动 的距离
                let ztop = currentZhong.y - startZhong.y;
                let zleft = currentZhong.x - startZhong.x;

                //获取增加的高度 * 中点在图片上的比例 再加上 中点移动的坐标
                img.style.top = startTop - ((newH - startHeigh) * startCentreY) + ztop + 'px';
                img.style.left = startLeft - ((newW - startWidth) * startCentreX) + zleft + 'px';


                if (canRotate) {
                    let currentDeg = getDeg(event.touches[0], event.touches[1]);
                    deg = currentDeg - startDeg;
                    // img.style.transformOrigin = startCentreX * 100 +'%, '+startCentreY * 100 +'%';
                    img.style.transform = 'rotate(' + deg + 'deg)';
                }
            } else if (event.touches.length == 1) {
                let X = event.touches[0].clientX - startX;
                let Y = event.touches[0].clientY - startY;
                img.style.left = X + startLeft + 'px';
                img.style.top = Y + startTop + 'px';
            }
        }
        function handleTouchEnd(event) {
            const img = imgMiddle
            if (event.touches.length == 1) {
                //从两指变成一指， 要重置 触点的坐标 和 img的top和left ，不然会乱飙
                startX = event.touches[0].clientX;
                startY = event.touches[0].clientY;
                startTop = img.offsetTop;
                startLeft = img.offsetLeft;
            }
        }
        return { handleTouchStart, handleTouchMove, handleTouchEnd }
    }
    function createHint() {
        const hintEl = document.createElement('div'); //1、创建元素

        hintEl.style.cssText = `
        border-radius: 60px;
        background-color: #000;
        color: #fff;
        padding: 2px 5px;
        z-index: 1003;
        display: none;
        user-select: none; 
    `
        hintEl.addEventListener('click', e => e.stopPropagation());
        return hintEl
    }

    // window.onmousewheel = document.onmousewheel = scrollFunc;//IE/Opera/Chrome
    // 
    function createImg(urlOrImgEl, hasAnimateWhenIsImgEl, { startZoom = 1 }) {
        // let startZoom = 1;
        const imgEl = document.createElement('img');

        let cssText = `
        width: 10px;
        height: 10px;
        top: 50%;
        left: 50%;
    `
        if (typeof urlOrImgEl === 'object') {

            const boundingClientRect = urlOrImgEl.getBoundingClientRect()
            const followCss = `
            width: ${boundingClientRect.width}px;
            height: ${boundingClientRect.height}px;
            top: ${boundingClientRect.top}px;
            left: ${boundingClientRect.left}px;
         `
            cssText = hasAnimateWhenIsImgEl ? followCss : cssText;
        }

        imgEl.style.cssText = cssText + `
        z-index: 1002;
        position: absolute;
        cursor: move;
        -webkit-tap-highlight-color: transparent;
        user-select: none;
        `

        imgEl.id = "yyz-img"
        const url = typeof (urlOrImgEl) == 'string' ? urlOrImgEl : urlOrImgEl.src
        imgEl.src = url;
        imgEl.draggable = false;//设置pc端不可拖动
        imgEl.addEventListener('click', e => e.stopPropagation());
        //图片加载完毕
        imgEl.onload = function () {
            //判断那一边是长边
            const isWidthLonger = (imgEl.offsetWidth / imgEl.offsetHeight) > (layerImage.offsetWidth / layerImage.offsetHeight)
            const widthLongerCss = `
        transition: all 0.5s;
        height: auto;
        width: ${startZoom * 100}%;
        left: ${(layerImage.offsetWidth - (layerImage.offsetWidth * startZoom)) / 2}px;
        top: ${(layerImage.offsetHeight - ((startZoom * layerImage.offsetWidth) * (imgEl.offsetHeight / imgEl.offsetWidth))) / 2}px;
    `

            const heightLongerCss = `
        transition: all 0.5s;
        width: auto;
        height: ${startZoom * 100}%;
        top: ${(layerImage.offsetHeight - (layerImage.offsetHeight * startZoom)) / 2}px;
        left: ${(layerImage.offsetWidth - ((layerImage.offsetHeight * startZoom) * (imgEl.offsetWidth / imgEl.offsetHeight))) / 2}px;
    `
            imgEl.style.cssText += isWidthLonger ? widthLongerCss : heightLongerCss;

            setTimeout(function () {
                imgEl.style.transition = ""
                imgWidth = imgEl.offsetWidth;
                imgHeight = imgEl.offsetHeight;
            }, 500);

        }
        // pc移动
        imgEl.onmousedown = event => {
            event.stopPropagation();
            let disX = event.clientX - imgEl.offsetLeft;
            let disY = event.clientY - imgEl.offsetTop;
            document.onmousemove = (event) => {
                imgEl.style.left = event.clientX - disX + "px";
                imgEl.style.top = event.clientY - disY + "px";
            };
        };
        imgEl.onmouseup = () => {
            document.onmousemove = null;
        };
        return imgEl;
    }
    function createMod(options) {
        const { hasCloseBox, hasActionBox } = options
        const modEl = document.createElement('div');

        modEl.style.cssText = `
        z-index: 1005;
        -webkit-tap-highlight-color: transparent;
        position: fixed;
        top: 0;
        left: 0;
        height: 100vh;
        width: 100%;
        pointer-events: none;
    `
        if (hasCloseBox) {
            // modEl.appendChild(createCloseBox())
            const closeBox = ` <div class="close-box"  onclick="YJIC.close()" style="pointer-events: auto;cursor:pointer; position: absolute;right: 0;top: 0;border-radius: 0 0 0 60px; width: 50px;height: 50px;background-color:rgba(0, 0, 0, .3);"> <div class="close-icon-div" style="width: 14px;height: 14px;padding: 3px; position: absolute;right: 10px;top: 10px;"> <svg t="1616924133328" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2052" width="14" height="14"><path d="M1023.997 114.97 911.408 2.388 516.149 397.629 118.5 0 5.91 112.585l397.649 397.629L7.107 906.648l112.587 112.59 396.454-396.439 395.259 395.249 112.59-112.59L628.738 510.214 1023.997 114.97z" p-id="2053" fill="#ffffff"></path></svg> </div> </div> `
            modEl.innerHTML += closeBox
        }
        if (hasActionBox) {
            const actionBox = `<div style="pointer-events: auto;position: absolute;bottom: 20px;left:0;width: 100%;">
        <div style="padding: 0 0px; margin: 0 auto;height: 40px;width: 160px;background-color: rgba(0, 0, 0, .3);border-radius: 20px;">
            <div onclick="YJIC.setAdd()" onMouseOver="this.style.backgroundColor='rgba(0, 0, 0, .6)'" onMouseOut="this.style.backgroundColor=''" style="border-radius: 20px;width: 20px; height: 20px; padding: 10px;float: left;cursor:pointer;">
                <svg t="1616925103431" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="10151" width="20" height="20"><path d="M836 476H548V188c0-19.8-16.2-36-36-36s-36 16.2-36 36v288H188c-19.8 0-36 16.2-36 36s16.2 36 36 36h288v288c0 19.8 16.2 36 36 36s36-16.2 36-36V548h288c19.8 0 36-16.2 36-36s-16.2-36-36-36z" p-id="10152" fill="#ffffff"></path></svg>
            </div>
            <div onclick="YJIC.setSubtract()" onMouseOver="this.style.backgroundColor='rgba(0, 0, 0, .6)'" onMouseOut="this.style.backgroundColor=''" style="border-radius: 20px;width: 20px; height: 20px; padding: 10px;float: left;cursor:pointer;">
                <svg t="1616925668114" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="10948" width="20" height="20"><path d="M725.33 480H298.66c-17.67 0-32 14.33-32 32s14.33 32 32 32h426.67c17.67 0 32-14.33 32-32s-14.32-32-32-32z" p-id="10949" fill="#ffffff"></path></svg>
            </div>
            <div onclick="YJIC.rotateRight()" onMouseOver="this.style.backgroundColor='rgba(0, 0, 0, .6)'" onMouseOut="this.style.backgroundColor=''" style="border-radius: 20px;width: 20px; height: 20px; padding: 10px;float: left;cursor:pointer;">
                <svg t="1616925730136" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1951" width="20" height="20"><path d="M503.466667 285.866667L405.333333 226.133333c-8.533333-8.533333-12.8-21.333333-8.533333-29.866666 8.533333-8.533333 21.333333-12.8 29.866667-8.533334l145.066666 89.6c8.533333 4.266667 12.8 17.066667 8.533334 29.866667l-89.6 145.066667c-4.266667 8.533333-17.066667 12.8-29.866667 8.533333-8.533333-4.266667-12.8-17.066667-8.533333-29.866667l64-102.4c-123.733333 4.266667-226.133333 106.666667-226.133334 234.666667s106.666667 234.666667 234.666667 234.666667c85.333333 0 162.133333-46.933333 204.8-119.466667 4.266667-8.533333 17.066667-12.8 29.866667-8.533333 8.533333 4.266667 12.8 17.066667 8.533333 29.866666-51.2 85.333333-140.8 140.8-238.933333 140.8-153.6 0-277.333333-123.733333-277.333334-277.333333 0-145.066667 110.933333-264.533333 251.733334-277.333333z" p-id="1952" fill="#ffffff"></path></svg>
            </div>
            <div onclick="YJIC.rotateLeft()" onMouseOver="this.style.backgroundColor='rgba(0, 0, 0, .6)'" onMouseOut="this.style.backgroundColor=''" style="border-radius: 20px;width: 20px; height: 20px; padding: 10px;float: left;cursor:pointer;">
                <svg t="1616925759280" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2144" width="20" height="20"><path d="M520.533333 285.866667c140.8 12.8 251.733333 132.266667 251.733334 277.333333 0 153.6-123.733333 277.333333-277.333334 277.333333-98.133333 0-192-55.466667-238.933333-140.8-4.266667-8.533333-4.266667-21.333333 8.533333-29.866666 8.533333-4.266667 21.333333-4.266667 29.866667 8.533333 42.666667 72.533333 119.466667 119.466667 204.8 119.466667 128 0 234.666667-106.666667 234.666667-234.666667s-98.133333-230.4-226.133334-234.666667l64 102.4c4.266667 8.533333 4.266667 21.333333-8.533333 29.866667-8.533333 4.266667-21.333333 4.266667-29.866667-8.533333l-89.6-145.066667c-4.266667-8.533333-4.266667-21.333333 8.533334-29.866667L597.333333 187.733333c8.533333-4.266667 21.333333-4.266667 29.866667 8.533334 4.266667 8.533333 4.266667 21.333333-8.533333 29.866666l-98.133334 59.733334z" p-id="2145" fill="#ffffff"></path></svg>
            </div>
        </div>
    </div>`
            modEl.innerHTML += actionBox;
        }
        return modEl
    }
    /**
     * 计算两个触点的位置
     * @param touch1 第一个触点
     * @param touch2 第二个触点
     */
    function getDst(touch1, touch2) {
        //计算两个直角边的长度
        let x = touch2.clientX - touch1.clientX; //水平方向的距离
        let y = touch2.clientY - touch1.clientY; //垂直方向的距离
        //利用勾股定理，计算两个触点的距离（斜边的长度）
        let z = Math.sqrt(x * x + y * y);
        // 返回结果
        return z;
    }

    /**
     * 计算两个触点的夹角（水平辅助线）的角度
     * @param touch1 第一个触点
     * @param touch2 第二个触点
     */
    function getDeg(touch1, touch2) {
        //计算两个触点的距离，两个直角边长度
        let x = touch2.clientX - touch1.clientX; //临边
        let y = touch2.clientY - touch1.clientY; //对边
        //根据两个直角边比例 tan，计算角度
        let angle = Math.atan2(y, x); //是个弧度
        //根据弧度计算角度
        let deg = angle / Math.PI * 180;
        //返回角度
        return deg;
    }

    /**
     * 计算两个触点的中点
     * @param touch1 第一个触点
     * @param touch2 第二个触点
     */
    function getZhong(touch1, touch2) {
        let dd = {};
        dd.x = Math.abs(touch2.clientX + touch1.clientX) / 2; //水平方向的距离
        dd.y = Math.abs(touch2.clientY + touch1.clientY) / 2; //垂直方向的距离
        // 返回结果
        return dd;
    }



    //下面适配pc
    let scrollFunc = function (e) {
        if (!options.isListenWheel) {
            return;
        }
        e = e || window.event;
        e.preventDefault && e.preventDefault(); //禁止浏览器默认事件
        let value;
        if (e.wheelDelta) {//IE/Opera/Chrome
            value = e.wheelDelta;
        } else if (e.detail) {//Firefox
            value = e.detail;
        }
        console.log(value);
        if (value > 0) {
            scale += 0.15
        } else {
            scale -= 0.15
        }

        if (scale < 0.1) {
            scale = 0.1
        }
        //回调
        if (sizeCallback != null) {
            sizeCallback(scale)
        }
        //弹出提示
        hintPopup(Math.round(scale * 100) + "%");

        let newW = scale * imgWidth;
        let newH = scale * imgHeight;
        const img = imgMiddle
        //旧的高度
        let oldH = img.offsetHeight;
        let oldW = img.offsetWidth;

        //计算中点在图片上的比例
        let imgNtop = (e.clientY - img.offsetTop) / img.offsetHeight;
        let imgNleft = (e.clientX - img.offsetLeft) / img.offsetWidth;
        //放大
        img.style.width = newW + 'px';
        img.style.height = newH + 'px';

        // //获取增加的高度 * 中点在图片上的比例 再加上 中点移动的坐标
        img.style.top = img.offsetTop - ((img.offsetHeight - oldH) * imgNtop) + 'px';
        img.style.left = img.offsetLeft - ((img.offsetWidth - oldW) * imgNleft) + 'px';
    }
    //给页面绑定滑轮滚动事件
    if (document.addEventListener) {
        document.addEventListener('DOMMouseScroll', scrollFunc, false);
    }
    //滚动滑轮触发scrollFunction方法  //ie 谷歌
    window.addEventListener('mousewheel', scrollFunc, {
        passive: false
    });






    /**
     * 弹出提示
     * @param {String} textToast 提示的内容
     */
    function hintPopup(textToast) {
        let hintTime = 300;
        if (hintTime == 0) return
        hint.style.display = ""
        hint.innerText = textToast;
        if (hintTimer) {
            clearTimeout(hintTimer);
        }
        hintTimer = setTimeout(function () {
            hint.style.display = "none"
        }, hintTime);
    }
    let hintTimer; //提示的定时器
    /**
     * 放大
     * @param {*} e 
     */
    function setAdd(e) {
        //取消事件冒泡 
        if (e && e.stopPropagation)
            e.stopPropagation();

        scale += 0.2
        upSize();
    }
    /**
     * 缩小
     * @param {*} e 
     */

    function setSubtract(e) {
        //取消事件冒泡 
        if (e && e.stopPropagation)
            e.stopPropagation();

        scale -= 0.2
        upSize();
    }
    /**
     * 向左旋转
     * @param {*} e 
     */
    function rotateLeft(e) {
        //取消事件冒泡 
        if (e && e.stopPropagation)
            e.stopPropagation();

        deg -= 90;
        upRotate();
    }
    /**
     * 向右旋转
     * @param {*} e 
     */
    function rotateRight(e) {
        //取消事件冒泡 
        if (e && e.stopPropagation)
            e.stopPropagation();

        deg += 90;
        upRotate();
    }

    /**
     * 更新旋转，带动画
     */
    function upRotate() {
        const img = imgMiddle
        img.style.transition = "transform 0.3s"
        img.style.transform = 'rotate(' + deg + 'deg)';
        clearTimeout(rotateTimer);
        rotateTimer = setTimeout(function () {
            img.style.transition = ""
        }, 300);
    }
    let rotateTimer; //旋转的动画的定时器


    /**
     * 更新大小，默认按屏幕中心缩放
     */
    function upSize() {

        if (scale < 0.1) {
            scale = 0.1
        }
        //回调
        if (sizeCallback != null) {
            sizeCallback(scale)
        }
        hintPopup(Math.round(scale * 100) + "%");

        let newW = scale * imgWidth;
        let newH = scale * imgHeight;
        const img = imgMiddle
        //旧的高度
        let oldH = img.offsetHeight;
        let oldW = img.offsetWidth;

        //计算中点在图片上的比例
        let imgNtop = (layerImage.offsetHeight / 2 - img.offsetTop) / img.offsetHeight;
        let imgNleft = (layerImage.offsetWidth / 2 - img.offsetLeft) / img.offsetWidth;


        img.style.transition = "all 0.3s"

        //放大
        img.style.width = newW + 'px';
        img.style.height = newH + 'px';

        // //获取增加的高度 * 中点在图片上的比例 再加上 中点移动的坐标
        img.style.top = img.offsetTop - ((newH - oldH) * imgNtop) + 'px';
        img.style.left = img.offsetLeft - ((newW - oldW) * imgNleft) + 'px';

        clearTimeout(rotateTimer);
        rotateTimer = setTimeout(function () {
            img.style.transition = ""
        }, 300);
    }


    /**
     * 设置初始图片相对浏览器的比例， 按长边算
     * @param {String} z {'90%'}
     */
    // function setStartZoom(z) {
    //     startZoom = z;
    // }
    /**
     * 设置提示延时关闭的时间， 0就不提示
     * @param {String} z 毫秒
     */
    // function setHintTime(t) {
    //     hintTime = t;
    // }
    let sizeCallback = null;
    /**
     * 设置缩放时的回调
     * @param {*} call 
     */
    function setSizeCallback(call) {
        sizeCallback = call;
    }
    let backCallback = null;
    /**
     * 设置关闭回调
     * @param {*} call 
     */
    function setBackCallback(call) {
        backCallback = call;
    }

    /**
     * 关闭
     */
    function close() {
        if (layerImage == null) {
            return
        }

        options.isListenWheel = false
        // 移除操作层
        layerAction.parentNode.removeChild(layerAction);
        // 图片层先动画，然后消失
        ; (function removeImgLayerAfterAnimate() {
            layerImage.style.transition = "all 0.2s"
            layerImage.style.opacity = 0;
            setTimeout(() => layerImage.parentNode.removeChild(layerImage), 200);
        })();
    }
    /**
     * 设置遮罩颜色 可以设置成 rgba(0,0,0,0) 透明
     * @param {color} color 
     */
    // function setBgc(color) {
    //     colorMask = color;
    // }

    /**
     * 设置手机两指是否可以旋转
     * @param {boolean} bool 
     */
    // function setDegIf(bool) {
    //     canRotate = bool;
    // }
    /**
     * 设置点击遮罩是否关闭, 只在pc端有效 因为手机端背景用来监听了手势
     * @param {boolean} bool 
     */
    function setShadeClose(bool) {
        isClickShadeClose = bool;
    }

    /**
     * 设置右上角的关闭按钮是否显示
     * @param {boolean} bool 
     */
    function setCloseIf(bool) {
        hasCloseBox = bool;
    }
    /**
    * 设置操作的按钮组是否显示
    * @param {boolean} bool 
    */
    function setHandleIf(bool) {
        hasActionBox = bool;
    }


    //  export  const popImg = {
    //     popImg,
    //     setStartZoom,
    //     setHintTime,
    //     setBgc,
    //     setDegIf,
    //     setShadeClose,
    //     setBackCallback,
    //     setCloseIf,
    //     setHandleIf,
    //     close,
    //     setAdd,
    //     setSubtract,
    //     rotateLeft,
    //     rotateRight
    //   }
    const YJIC = {
        popImg,
        // setStartZoom,
        // setHintTime,
        // setBgc,
        // setDegIf,
        setShadeClose,
        setBackCallback,
        setCloseIf,
        setHandleIf,
        close,
        setAdd,
        setSubtract,
        rotateLeft,
        rotateRight
    };


    //   YJIC.close = close;
    //   YJIC.setAdd = setAdd;
    //   YJIC.setSubtract = setSubtract;
    //   YJIC.rotateLeft = rotateLeft;
    //   YJIC.rotateRight = rotateRight;

    //   暴露
    (window).YJIC = YJIC;
}
