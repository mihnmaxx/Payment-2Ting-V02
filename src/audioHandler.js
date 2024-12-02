const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs').promises;
const util = require('util');
const exec = util.promisify(require('child_process').exec);

const client = new textToSpeech.TextToSpeechClient();

async function playNotification(message) {
    try {
        const request = {
            input: { text: message },
            voice: {
                languageCode: 'vi-VN',
                name: 'vi-VN-Standard-A',
                ssmlGender: 'FEMALE'
            },
            audioConfig: {
                audioEncoding: 'MP3'
            },
        };

        const [response] = await client.synthesizeSpeech(request);
        const outputFile = process.platform === 'win32' ? '.\\temp-audio.mp3' : './temp-audio.mp3';
        await fs.writeFile(outputFile, response.audioContent);

        // Chọn lệnh phát âm thanh theo platform
        const playCommand = process.platform === 'win32'
             ? `start wmplayer "${outputFile}"`
             : `afplay ${outputFile}`;

        await exec(playCommand);

        // Xóa file sau khi phát
        setTimeout(async () => {
            await fs.unlink(outputFile);
        }, 5000);        
    } catch (error) {
        console.error('Audio playback error:', error);
    }
}

module.exports = { playNotification };