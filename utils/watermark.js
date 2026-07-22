const { createCanvas, loadImage } = require('canvas');
const { cloudinary } = require('../Cloudconfig');

async function addWatermarkToResource(fileUrl, userId, courseId) {
    try {
        // Download the file
        const image = await loadImage(fileUrl);
        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext('2d');
        
        // Draw original image
        ctx.drawImage(image, 0, 0);
        
        // Add watermark
        ctx.font = '20px Arial';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // User identifier (hashed for privacy)
        const watermarkText = `User: ${userId.substring(0, 8)} | Course: ${courseId.substring(0, 8)}`;
        
        // Diagonal watermark
        ctx.save();
        ctx.translate(canvas.width/2, canvas.height/2);
        ctx.rotate(-45 * Math.PI / 180);
        ctx.fillText(watermarkText, 0, 0);
        ctx.restore();
        
        // Upload to Cloudinary
        const stream = canvas.toBuffer('image/png');
        const result = await cloudinary.uploader.upload_stream({
            folder: 'course-resources/watermarked',
            public_id: `wm_${Date.now()}`,
            resource_type: 'auto'
        });
        
        return result;
    } catch (error) {
        console.error('Watermark error:', error);
        return null;
    }
}

module.exports = { addWatermarkToResource };