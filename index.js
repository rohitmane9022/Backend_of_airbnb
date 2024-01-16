const express = require('express')
const { default: mongoose } = require('mongoose')
const cors = require("cors");
require('dotenv').config()

const User = require("./models/User");
const Booking = require("./models/Booking");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookiesParser = require("cookie-parser");
const imageDownloader = require("image-downloader");
const multer = require("multer");
const fs = require("fs");
const Place = require("./models/Place");

const app = express()
const port = 3000
mongoose.connect(process.env.MONGO_URL)
console.log(process.env.MONGO_URL)


app.use(cookiesParser());
app.use(
  cors({
    credentials: true,
    origin: "http://localhost:5173", // Remove the trailing slash
  }),
);
app.listen(3000)


app.get("/login",(req,res)=>{
  res.send("here is login data")
})


const getUserDataFromReq = (req) => {
  return new Promise((resolve, reject) => {
    jwt.verify(req.cookies.token, jwtSecret, {}, async (err, UserData) => {
      if (err) throw err;
      resolve(UserData);
    });
  });
};

app.use("/uploads", express.static((__dirname, "upload")));

app.use(express.json());

app.get("/", (req, res) => {
  res.json("Hello, Express!");
});



const secret = bcrypt.genSaltSync(10);
const jwtSecret = "rohitkjdnbuifhndfnk45";

app.post("/register", async (req, res) => {
  try {
    let { name, email, password } = req.body;
    let userInfo = { name, email, password: bcrypt.hashSync(password, secret) };
    const UserRegister = await UsersRegister(userInfo);
    if (UserRegister) {
      res
        .status(201)
        .json({ message: "User Register Successfully", UserRegister });
    }
  } catch (error) {
    res.status(500).json({ error: "Somthing went wrong please check again" });
  }
});

const UsersRegister = async (data) => {
  try {
    const UserData = new User(data);
    const UserSave = await UserData.save();
    console.log(UserSave);
    return UserSave;
  } catch (error) {
    return error;
  }
};

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const UserData = await User.findOne({ email: email });
  console.log(UserData);
  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Please provide both email and password" });
  }
  if (UserData) {
    const passwordOk = bcrypt.compareSync(password, UserData.password);

    if (passwordOk) {
      jwt.sign(
        { email: UserData.email, id: UserData._id, name: UserData.name },
        jwtSecret,
        {},
        (err, token) => {
          if (err) {
            console.error(err);
            res.status(500).json({ error: "Internal Server Error" });
          } else {
            // Add the sameSite and secure options here
            res
              .cookie("token", token, { sameSite: "None", secure: true })
              .json(UserData);
          }
        },
      );
    } else {
      res.status(422).json("wrong pass");
    }
  } else {
    res.json("not found");
  }
});

app.get("/profile", (req, res) => {
  const { token } = req.cookies;
  if (token) {
    jwt.verify(token, jwtSecret, {}, async (err, UserData) => {
      if (err) throw err;
      const { name, email, _id } = await User.findById(UserData.id);
      res.json({ name, email, _id });
    });
  } else {
    res.json(null);
  }
});

app.post("/logout", (req, res) => {
  res.cookie("token", "", { sameSite: "None", secure: true }).json(true);
});

app.post("/upload-by-link", async (req, res) => {
  const { link } = req.body;
  const newName = "photos" + Date.now() + `.jpg`;

  await imageDownloader.image({
    url: link,
    dest: __dirname + "/upload/" + newName,
  });
  res.json(newName);
});

const photoMiddleware = multer({ dest: "upload/" });

app.post("/upload", photoMiddleware.array("photos", 1000), (req, res) => {
  const uploadFiles = [];
  for (let i = 0; i < req.files.length; i++) {
    const { path, originalname } = req.files[i];
    const parts = originalname.split(".");
    const ext = parts[parts.length - 1];
    const newPath = path + "." + ext;
    fs.renameSync(path, newPath);
    uploadFiles.push(newPath.replace("upload/", ""));
  }
  res.json(uploadFiles);
});

app.post("/place", async (req, res) => {
  const {
    owner,
    title,
    address,
    addedPhotos,
    description,
    perks,
    extraInfo,
    checkIn,
    checkOut,
    maxGuest,
    Price,
  } = req.body;
  const { token } = req.cookies;
  jwt.verify(token, jwtSecret, {}, async (err, UserData) => {
    if (err) throw err;
    const PlaceDoc = await Place.create({
      owner: UserData.id,
      title,
      address,
      photos: addedPhotos, // Updated field name to 'photos'
      description,
      perks,
      extraInfo,
      checkIn,
      checkOut,
      maxGuest,
      Price,
    });

    if (PlaceDoc) {
      res.status(201).json({ message: "Here is Place Posted", PlaceDoc });
      console.log(PlaceDoc);
    }
  });
});

app.get("/user-place", async (req, res) => {
  const { token } = req.cookies;
  jwt.verify(token, jwtSecret, {}, async (err, UserData) => {
    const { id } = UserData;
    const AllPlace = await Place.find({ owner: id });
    if (AllPlace) {
      res.status(201).json({ message: "Here is All Place Data", AllPlace });
    }
  });
});

app.get("/place/:id", async (req, res) => {
  const { id } = req.params;
  res.json(await Place.findById(id));
});

app.put("/place", async (req, res) => {
  const { token } = req.cookies;
  const {
    id,
    title,
    address,
    addedPhotos,
    description,
    perks,
    extraInfo,
    checkIn,
    checkOut,
    maxGuest,
    Price,
  } = req.body;
  jwt.verify(token, jwtSecret, {}, async (err, UserData) => {
    if (err) throw err;
    const PlaceDoc = await Place.findById(id);
    if (UserData.id === PlaceDoc.owner.toString()) {
      PlaceDoc.set({
        title,
        address,
        photos: addedPhotos,
        description,
        perks,
        extraInfo,
        checkIn,
        checkOut,
        maxGuest,
        Price,
      });
      await PlaceDoc.save();
      console.log(PlaceDoc);
      res.json("Ok Valu update");
    }
  });
});

app.get("/places", async (req, res) => {
  const Places = await Place.find();
  if (Places) {
    res.status(201).json({ message: "here is all Place Data", Places });
  }
});

app.post("/bookings", async (req, res) => {
  const UserData = await getUserDataFromReq(req);
  const { place, checkIn, checkOut, numberOfGuests, name, Phone, price } =
    req.body;

  await Booking.create({
    place,
    checkIn,
    checkOut,
    numberOfGuests,
    name,
    Phone,
    price,
    user: UserData.id,
  })
    .then((doc) => {
      res.json(doc);
    })
    .catch((err) => {
      throw err;
    });
});

app.get("/booking", async (req, res) => {
  const UserData = await getUserDataFromReq(req);
  res.json(await Booking.find({ user: UserData.id }).populate(`place`));
});