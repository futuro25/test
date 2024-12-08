const cloudinary = require('cloudinary').v2;
const self       = {};
const { addDays } = require('date-fns');
var nodemailer = require('nodemailer');

cloudinary.config({ 
  cloud_name: 'dg2uuerzi', 
  api_key: '245255439365974', 
  api_secret: 'a-o1PWgkzcOXGGL1CcSxD23Cf00',
  secure: true
});

/////////////////////////
// Uploads an image file
/////////////////////////
async function uploadImage(imagePath) {
  // Use the uploaded file's name as the asset's public ID and 
  // allow overwriting the asset with new versions
  const options = {
    use_filename: true,
    unique_filename: false,
    overwrite: true,
  };

  try {
    // Upload the image
    const result = await cloudinary.uploader.upload(imagePath, options);
    console.log(result);
    return result;
  } catch (error) {
    console.error(error);
  }
};

const handleError = (res, e) => {
  if (e.status) {
    res.status(e.status).json({ error: e.message });
  } else {
    res.status(500).json({ error: e.message });
  }
  return res; 
}

const addDaysToDate = (date, days) => {
  return addDays(date, parseInt(days));
}

module.exports = { uploadImage, handleError, addDaysToDate };