const { s3 } = require("../config/cloudflare-config.js");
const { DeleteObjectCommand } = require("@aws-sdk/client-s3");


const deleteFromR2 = async (key) => {

    if (!key) {
        return;
    }

    const command = new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: key,
    });


    await s3.send(command);

}


module.exports = deleteFromR2;