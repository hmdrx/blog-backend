const cloudinary = require('cloudinary').v2;

const express = require('express');
const multer = require('multer');
const { join } = require('path');
const cors = require('cors');
const morgan = require('morgan');
const jwt  = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const globalErrorHandller = require('./controller/errorController');
const AppError = require('./utils/AppError');
const authRoute = require('./routes/auth');
const userRoute = require('./routes/users');
const postRoute = require('./routes/posts');
const categoryRoute = require('./routes/categories');
const { json } = require('express');

const User = require('./models/User');

const app = express();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.set('view engine', 'pug');
app.set('views', join(__dirname, 'views'));

app.use(express.json());
app.use(express.static(join(__dirname, 'public')));
app.use(cors());

//MIDDLEWARE
app.use(morgan('dev'));

const storage = multer.diskStorage({});
const filter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(AppError('not an image plz upload img only', 400), false);
  }
};

// PARSER
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

const upload = multer({ storage: storage, fileFilter: filter });


app.patch('/api/uploadPost', upload.single('photo'), async (req, res, next) => {
  let token;
  if (req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if(!token){
    return next(new AppError('not token', 401))
  }
  const decoded = await jwt.verify(token, process.env.JWT_SECRET)

  const user = await User.findById(decoded.id);
  if (!user) {
    return next(new AppError('plz login first to update photo', 401));
  }
  const cloud = await cloudinary.uploader.upload(req.file.path, {
    public_id: 'profile_01',
    transformation: [
      // { width: 500, height: 500, crop: 'fill' },
      { quality: 90 },
    ],
  });
  
  await User.findByIdAndUpdate(user._id,{profilePic: cloud.url})

  res.status(200).json('File has been uploaded');
});

app.get('/', (req, res, next) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

app.use('/api/auth', authRoute);
app.use('/api/users', userRoute);
app.use('/api/posts', postRoute);
app.use('/api/category', categoryRoute);

app.use('*', (req, res, next) => {
  res.render('error', { title: 404, message: 'Page Not Found!!' });
});
app.use(globalErrorHandller);

module.exports = app;
