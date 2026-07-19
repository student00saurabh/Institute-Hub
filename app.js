if (process.env.NODE_ENV != "production") {
  require("dotenv").config();
}

const express = require("express");
const app = express();
const path = require("path");
const mongoose = require("mongoose");
// const csrf = require("csurf");
// const cookieParser = require("cookie-parser");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const crypto = require("crypto");
const passport = require("passport");
const brevo = require("@getbrevo/brevo");
const Razorpay = require("razorpay");
const { welComeEmail } = require("./utils/sendWelcomeEmail");

const GoogleStrategy = require("passport-google-oauth20").Strategy;
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");

const homeRouter = require("./routes/home.js");
const userRouter = require("./routes/user.js");
const resetRout = require("./routes/authRoutes.js");
const searchRoutes = require("./routes/search");
const user = require("./models/user.js");
const adminRouter = require("./routes/admin.js");
const othersRouter = require("./routes/others.js");
const blogRouter = require("./routes/blog.js");
const serviceRouter = require("./routes/service.js");
const sitemapRouter = require("./routes/sitemap.js");
const categoryRouter = require("./routes/category");
const reviewRouter = require("./routes/review");
const ratingRouter = require("./routes/rating");
// const diplomaRouter = require("./routes/diploma.js");
// const Diploma = require("./models/diploma.js");
const seoMeta = require("./utils/seoMeta.json");
const Cources = require("./models/cources.js");
const CourseCategory = require("./models/courseCategory");

const dbUrl = process.env.ATLUSDB_URL;

main()
  .then(() => {
    console.log("connected to DB");
  })
  .catch((err) => {
    console.log(err);
  });

async function main() {
  await mongoose.connect(dbUrl);
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "/public")));

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});


const store = MongoStore.create({
  mongoUrl: dbUrl,
  // crypto: {
  //   secret: process.env.SECRET,
  // },
  touchAfter: 24 * 3600,
});

store.on("error", (err) => {
  console.log("error in mongo session store", err);
});

const sessionOptions = {
  store,
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    expire: Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    //httpOnly: true,
  },
};

app.use(session(sessionOptions));
app.use(flash());


app.use(passport.initialize());
app.use(passport.session());
passport.use(
  new LocalStrategy({ usernameField: "email" }, User.authenticate()),
);

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.DOMAIN + "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let email = profile.emails[0].value;
        let name = profile.displayName;

        // Check existing user
        let existingUser = await User.findOne({ email });

        if (existingUser) {
          return done(null, existingUser);
        }

        const username = email.split("@")[0];
        // Create new user
        let newUser = new User({
          name,
          email,
          googleId: profile.id,
          isVerified: true,
          username,
          authMethod: "google",
        });

        await newUser.save();
        await welComeEmail({
          name: newUser.name,
          email: newUser.email,
        });
        return done(null, newUser);
      } catch (err) {
        console.error("Google OAuth Error:", err);
        return done(err, null);
      }
    },
  ),
);

app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.info = req.flash("info");
  res.locals.warning = req.flash("warning");
  res.locals.primary = req.flash("primary");
  res.locals.currUser = req.user || null;
  res.locals.currentPath = req.path;
  res.locals.showsplash = false;
  next();
});

// Navbar Courses Middleware
app.use(async (req, res, next) => {
  try {
    const courses = await Cources.find({ isActive: true });

    if (courses && courses.length > 0) {
      const navbarCourses = courses.filter(
        (course) => course.showInNavbar === true,
      );

      const navbarItems = (navbarCourses || []).map((course) => ({
        id: course._id,
        name: course.navbarButtonText || course.title,
        color: course.navbarButtonColor || "blue",
        url: `/courses/${course._id}`,
      }));

      res.locals.navbarCourses = navbarItems;
      //console.log("Navbar Courses Middleware: Found courses for navbar", navbarItems);
    } else {
      // No courses found in database
      res.locals.navbarCourses = [];
    }
    next();
  } catch (error) {
    console.error("Navbar Courses Middleware Error:", error);
    // Always set empty array to avoid undefined errors in views
    res.locals.navbarCourses = [];
    next();
  }
});

app.use((req, res, next) => {
  let meta = seoMeta[req.path];

  if (!meta) {
    if (req.path.startsWith("/blogs")) meta = seoMeta["/blogs"];
    else if (req.path.startsWith("/courses")) meta = seoMeta["/courses"];
    else meta = seoMeta["/"];
  }

  const host = process.env.DOMAIN || req.get('host');
  const fullUrl = req.protocol + '://' + host + req.originalUrl;

  meta = Object.assign(
    {
      image: '/images/logo.png',
      canonical: fullUrl,
    },
    meta
  );

  res.locals.meta = meta;
  next();
});

app.use((req, res, next) => {
  const host = process.env.DOMAIN || req.get('host');
  res.locals.requestUrl = req.protocol + '://' + host + req.originalUrl;
  next();
});

// ========== NAVBAR MIDDLEWARE (FIXED) ==========
app.use(async (req, res, next) => {
  try {
    // ✅ Use 'Cources' (not 'Course') - correct model name
    const courses = await Cources.find({ isActive: true })
      .populate('category')
      .lean();

    // Fetch all active categories
    const categories = await CourseCategory.find({ isActive: true })
      .sort({ displayOrder: 1, name: 1 })
      .lean();

    // Build navbar data structure
    const navbarData = [];

    // Add categories with their courses
    for (const category of categories) {
      const categoryCourses = courses.filter(
        course => course.category?._id?.toString() === category._id?.toString()
      );

      navbarData.push({
        _id: category._id,
        name: category.name,
        slug: category.slug,
        icon: category.icon || 'fa-folder',
        color: category.color || 'blue',
        courseCount: categoryCourses.length,
        courses: categoryCourses.slice(0, 8) // Max 8 courses per category
      });
    }

    // Add "Others" category for uncategorized courses
    const uncategorizedCourses = courses.filter(
      course => !course.category || !course.category._id
    );

    if (uncategorizedCourses.length > 0) {
      navbarData.push({
        _id: 'others',
        name: 'Others',
        slug: 'others',
        icon: 'fa-folder-open',
        color: 'gray',
        courseCount: uncategorizedCourses.length,
        courses: uncategorizedCourses.slice(0, 8)
      });
    }

    // Store in res.locals for all views
    res.locals.navbarCategories = navbarData;
    res.locals.navbarCourses = courses;

    next();
  } catch (error) {
    console.error('Navbar Middleware Error:', error);
    res.locals.navbarCategories = [];
    res.locals.navbarCourses = [];
    next();
  }
});

app.use("/search", (req, res, next) => {
  // Allow only AJAX/API requests to pass through
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return next();
  }
  // Redirect to homepage for direct browser access
  req.flash("info", "Please use the search bar on our website.");
  res.redirect("/");
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  (req, res) => {
    req.flash("success", "Welcome to Cyber Kavach!");
    res.redirect("/");
  },
);

app.use("/", userRouter);
app.use("/", homeRouter);
app.use("/", searchRoutes);
app.use("/", resetRout);
app.use("/", othersRouter);
// app.use("/", diplomaRouter);
app.use("/", sitemapRouter);
app.use("/", reviewRouter);
app.use("/", ratingRouter);
app.use("/blogs", blogRouter);
app.use("/services", serviceRouter);
app.use("/admin", adminRouter);
app.use("/admin", categoryRouter);

app.all(/.*/, (req, res, next) => {
  next(new ExpressError(404, "Page not found!"));
});

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err); // agar response already sent ho, dobara send mat karo
  }
  let { statusCode = 500, message = "Something went wrong!" } = err;
  res.status(statusCode).render("error.ejs", { message, statusCode });
});

app.listen(8080, () => {
  console.log(`cyberkavach.org.in is working at ${8080}`);
});
