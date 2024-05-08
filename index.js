const { makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys')

let sock;
async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')

    sock = makeWASocket({
        // can provide additional config here
        printQRInTerminal: true,
        auth: state
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut
            console.log('connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect)
            // reconnect if not logged out
            if (shouldReconnect) {
                connectToWhatsApp()
            }
        } else if (connection === 'open') {
            console.log('opened connection')
        }
    })

    sock.ev.on('messages.upsert', async m => {
        if (m.messages[0].key.fromMe) return

        console.log(JSON.stringify(m, undefined, 2))

        // console.log('replying to', m.messages[0].key.remoteJid)
        // await sock.sendMessage(m.messages[0].key.remoteJid, { text: 'Hello there!' })

        for (const message of m.messages) {
            if (message.message.extendedTextMessage) {
                await sock.sendMessage(message.key.remoteJid, { text: message.message.extendedTextMessage.text })
            }
        }
    })
}

const express = require('express')
const app = express()
const port = 3000
const bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.post('/send', async (req, res) => {
    res.send('Sending')
    // await sock.sendMessage('62**********@s.whatsapp.net', { text: 'Now : ' + (new Date()).toString()})

    await sock.sendMessage(req.body.to + '@s.whatsapp.net', { text: req.body.text })
    console.log(req.body);
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
    console.log('Connecting')
    connectToWhatsApp()
})
