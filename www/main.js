const socket = io()
const gui = document.createElement('section')
const canvas = document.createElement('canvas')
const ctx = canvas.getContext('2d')
const timer = { index:0, interval:0, speed:0.1 }
let imgs = []

setup()

function setup(){
    // setup canvas
    applyCSS(canvas,{
        position:"absolute", left:"0px", top:"0px", zIndex:"1"
    })
    canvas.addEventListener('click',()=>{
        gui.style.display = "block"
    })
    document.body.appendChild( canvas )
    window.addEventListener('resize',resize)

    // setup GUI
    applyCSS(gui,{
        position:"absolute", left:"0px", top:"0px", zIndex:"2",
        width:"100%", height:"100%", display:"none"
    })
    document.body.appendChild( gui )
    createButton(gui,'run-updates')
    createButton(gui,'restart-app')
    createButton(gui,'quit-app')
    createButton(gui,'restart-computer')
    createButton(gui,'poweroff')
    createButton(gui,'close-menu',()=>{
        gui.style.display = "none"
    })

    // setup socket listeners
    socket.on('new-image',(filename)=>loadImage(filename))
    socket.on('images-downloaded',(filenames)=>{
        filenames.forEach(filename=>loadImage(filename))
    })

    // get things rolling
    socket.emit('download-latest-images') // to downloads folder
    downloadImagesAgainIn(5000)
    resize()
    draw()
}

function downloadImagesAgainIn(mili){
    setTimeout(()=>{
        socket.emit('download-latest-images') // to downloads folder
        downloadImagesAgainIn(mili)
    },mili)
}

/* -----------------------------------------------------------------------------
---------------------------------------------------------------------- dom stuff
----------------------------------------------------------------------------- */

function applyCSS(element,cssObj){
    for(prop in cssObj) element.style[prop] = cssObj[prop]
}

function createButton(gui,name,clickEvent){
    let div = document.createElement('div')
    if(clickEvent){
        div.addEventListener('click',clickEvent)
    } else {
        div.addEventListener('click',()=>{
            socket.emit(name)
            gui.style.display = 'none'
        })
    }
    div.textContent = name
    applyCSS(div,{
        color:'#fff', backgroundColor:'#c40477', textAlign:'center',
        padding: '20px', fontSize: '28px', fontFamily: 'monospace',
        cursor: 'pointer', borderBottom: '1px solid #fff'
    })
    gui.appendChild(div)
}


/* -----------------------------------------------------------------------------
--------------------------------------------------------------- canvas animation
----------------------------------------------------------------------------- */

function resize(){
    canvas.width = innerWidth
    canvas.height = innerHeight
}

function loadImage(filename){
    let img = new Image()
    img.onload = ()=>{
        let names = imgs.map(img=>img.src)
        if(!names.includes(img.src)) imgs.push(img)
    }
    img.src = `downloads/${filename}`
}

function matchFrameSize(pic){
    return {
        width:{
            w:innerWidth,
            h:pic.height * (innerWidth/pic.width)
        },
        height:{
            w:pic.width * (innerHeight/pic.height),
            h:innerHeight
        }
    }
}

function zoomIn(percent,pic,timer){
    let match = matchFrameSize(pic).height
    let maxWidth = match.w + (match.w*percent)
    let rangeWidth = maxWidth - match.w
    let maxHeight = match.h + (match.h*percent)
    let rangeHeight = maxHeight - match.h
    let w = match.w + (rangeWidth * timer.interval)
    let h = match.h + (rangeHeight * timer.interval)
    let x = (innerWidth-w) / 2
    let y = -(h-match.h)/2
    return { x, y, w, h }
}

function draw(){
    requestAnimationFrame( draw )
    if(imgs.length > 0){
        let pic = imgs[timer.index]
        let nxt = timer.index+1 >= imgs.length ?
            imgs[0] : imgs[timer.index+1]
        let t = zoomIn(0.25,pic,timer)
        if( timer.interval < 1 ){
            ctx.fillRect(0,0,innerWidth,innerHeight)
            ctx.drawImage( pic, t.x, t.y, t.w, t.h )
            timer.interval += timer.speed/60
        } else {
            timer.interval = 0
            timer.index++
            if(timer.index >= imgs.length) timer.index = 0
        }
    }
}
