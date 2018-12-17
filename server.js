const { exec } = require('child_process')
const fs = require('fs')
const gdrive = require("./gdrive_frame/dist").default
const express = require('express')
const app = express()
const http = require('http').Server(app)
const io = require('socket.io')(http)
const port = process.argv[2] || 8000
const chokidar = require('chokidar')
const watcher = chokidar.watch(`${__dirname}/www/downloads`, {
  ignored: /[\/\\]\./, persistent: true, ignoreInitial:true
})

// ~ . _ . ~ * ~ . _ . ~ * ~ . _ . ~ * ~ . _ . ~ * ~ . _ . ~ * ~ . _ . ~ * ~ . _
// ~ . _ . ~ * ~ . _ . ~ * ~ . _ . ~ * ~ . _ . ~ * ~ . _ . ~ * ~ . _ . ~ * ~ . _

function execLog(err,stdout,stderr){
    if(err) return console.error(err)
    console.log(`${stdout}`)
    console.log(`${stderr}`)
}

function statusLog(str){
    let d = '########'
    for (let i = 0; i < str.length; i++) d+='#'
    console.log(d)
    console.log(`##  ${str}  ##`)
    console.log(d)
}

function startChromium(log){
    statusLog('launching chromium')
    exec(`chromium-browser --kiosk http://localhost:${port}`, execLog)
}

function downloadImagesFromGdrive(socket){
    let path = `${__dirname}/www/downloads`
    gdrive(path)
    // TODO run in callback or promise instead of timeout, ex:
    // gdrive(path).then((files)=>socket.emit('images-downloaded',files))
    setTimeout(()=>{
        let filenames = []
        fs.readdirSync(path).forEach(img=>filenames.push(img))
        socket.emit('images-downloaded',filenames)
    },3000)
}

function restartApp(){
    statusLog('restarting app')
    exec(`pm2 restart server`, execLog)
}

function quitApp(){
    statusLog('stopping app')
    exec(`pm2 stop server`, execLog)
}

function restartComputer(){
    statusLog('restarting computer')
    exec(`reboot`, execLog)
}

function pullChanges(){
    statusLog('pulling updates')
    exec(`cd ${__dirname} ; git pull origin master`, execLog)
}

// ~ . _ . ~ * ~ . _ . ~ * ~ . _ . ~ * ~ . _ . ~ * ~ . _ . ~ * ~ . _ . ~ * ~ . _
// ~ . _ . ~ * ~ . _ . ~ * ~ . _ . ~ * ~ . _ . ~ * ~ . _ . ~ * ~ . _ . ~ * ~ . _

app.use( express.static(__dirname+'/www') )

startChromium()

io.on('connection',function(socket){
    socket.on('download-latest-images',()=>downloadImagesFromGdrive(socket))
    socket.on('run-updates',pullChanges)
    socket.on('restart-app',restartApp)
    socket.on('quit-app',quitApp)
    socket.on('restart-computer',restartComputer)
    watcher.on('add',(path,stats)=>{
        let pathArr = path.split('/')
        let filename = pathArr[pathArr.length-1]
        socket.emit('new-image',filename)
    })
})

http.listen( port, function(err){
    if(err) console.log(err)
    else statusLog(`server is listening, visit http://localhost:${port}`)
})
