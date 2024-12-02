const express = require('express');
const router = express.Router();
const ngrok = require('ngrok');
const axios = require('axios');
const crypto = require('crypto');

const CASSO_API_KEY = process.env.CASSO_API_KEY;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
let WEBHOOK_ID = null; // Lưu trữ webhook ID

// Chỉ thông báo trạng thái, không in giá trị
console.log('WEBHOOK_SECRET is ready');

async function registerWebhookWithCasso(webhookUrl) {
    try {
        const response = await axios.post('https://oauth.casso.vn/v2/webhooks', {
            webhook: webhookUrl,
            secure_token: WEBHOOK_SECRET,
            income_only: true  // Thay send_only_income thành income_only
        }, {
            headers: {
                'Authorization': `Apikey ${CASSO_API_KEY}`,
                'Content-Type': 'application/json',
                'secure-token': WEBHOOK_SECRET
            },
            timeout: 30000 // Thêm timeout 30s như ví dụ
        });

        if (response.data.error === 0) {
            console.log('Webhook registered successfully');
            console.log('Webhook ID:', response.data.data.id);
            WEBHOOK_ID = response.data.data.id;
            return response.data.data;
        }
    } catch (error) {
        console.error('Failed to register webhook:', error.message);
        throw error;
    }
}
const { saveWebhookConfig, getWebhookConfig } = require('./database');

async function updateWebhookWithCasso(webhookUrl) {
    try {
        const config = await getWebhookConfig();
        WEBHOOK_ID = config.webhook_id;
        const secureToken = config.secure_token;

        const webhookData = {
            webhook: webhookUrl,
            secure_token: secureToken,
            income_only: true
        };

        if (!WEBHOOK_ID) {
            const response = await axios.post('https://oauth.casso.vn/v2/webhooks', webhookData, {
                headers: {
                    'Authorization': `Apikey ${CASSO_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });

            if (response.data.error === 0) {
                await saveWebhookConfig(response.data.data.id, secureToken);
                return response.data.data;
            }
        } else {
            const response = await axios.put(`https://oauth.casso.vn/v2/webhooks/${WEBHOOK_ID}`, webhookData, {
                headers: {
                    'Authorization': `Apikey ${CASSO_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });

            if (response.data.error === 0) {
                return response.data.data;
            }
        }
    } catch (error) {
        console.error('Webhook operation failed:', error.message);
        throw error;
    }
}
async function startNgrok(port) {
    try {
        const url = await ngrok.connect(port);
        console.log('Ngrok URL:', url);
        
        // Cập nhật hoặc đăng ký webhook với URL mới
        const webhookUrl = `${url}/api/webhook`;
        await updateWebhookWithCasso(webhookUrl);
        
        return url;
    } catch (error) {
        console.error('Setup error:', error);
        throw error;
    }
}

// Thêm middleware kiểm tra secure token
const verifyWebhookSecret = async (req, res, next) => {
    try {
        const receivedToken = req.headers['secure-token'];
        const config = await getWebhookConfig();
        const storedToken = config.secure_token;
        
        console.log('Received token:', receivedToken);
        console.log('Stored token:', storedToken);
        
        if (receivedToken === storedToken) {
            next();
        } else {
            res.status(401).json({ success: false, message: 'Unauthorized' });
        }
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
const { playNotification } = require('./audioHandler');

router.post('/webhook', verifyWebhookSecret, async (req, res) => {
    try {
        const webhookData = req.body;
        
        if (webhookData.error === 0 && webhookData.data && webhookData.data.length > 0) {
            webhookData.data.forEach(transaction => {
                const amount = transaction.amount;
                const message = `Đã nhận được ${amount.toLocaleString('vi-VN')} đồng`;
                playNotification(message);
            });
            
            res.status(200).json({ success: true, message: 'Webhook processed successfully' });
        } else {
            res.status(400).json({ success: false, message: 'Invalid webhook data' });
        }
    } catch (error) {
        console.error('Webhook processing error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});module.exports = {
    router,
    initNgrok: startNgrok,
    updateWebhook: updateWebhookWithCasso
};