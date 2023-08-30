
function createImg(urlOrImgEl, follow = false) {
  const img = document.createElement('img');
  img.id = "yyz-img"
  const url = typeof (urlOrImgEl) === 'string' ? urlOrImgEl : urlOrImgEl.src
  const isImgEl = typeof (urlOrImgEl) === 'object'


  let cssText = `
    width: 10px;
    height: 10px;
    top: 50%;
    left: 50%;
    `
  if (isImgEl) {
    const boundingClientRect = urlOrImgEl.getBoundingClientRect()
    const followCss = `
      width: ${boundingClientRect.width}px;
      height: ${boundingClientRect.height}px;
      top: ${boundingClientRect.top}px;
      left: ${boundingClientRect.left}px;
      `
    follow && (cssText = followCss);
  }


  img.style.cssText = cssText + `
    z-index: 1002;
    position: absolute;
    cursor: move;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
    `

  
  img.src = url;
  img.draggable = false;//设置pc端不可拖动
  img.addEventListener('click', e => e.stopPropagation());
  return img;
}