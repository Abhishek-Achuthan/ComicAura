const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/userSchema');

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: "/auth/google/callback",
            scope: ["profile", "email"]
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                let user = await User.findOne({ email: profile.emails[0].value });

                if (user) {
                    if (!user.socialLogin.isUsed) {
                        user.socialLogin.isUsed = true;
                        user.socialLogin.provider = 'GOOGLE';
                        user.socialLogin.socialId = profile.id;
                        await user.save();
                    }
                    return done(null, user);
                }
   
                user = await User.create({
        
                    firstName: profile.name.givenName || '',
                    lastName: profile.name.familyName || '',
                    email: profile.emails[0].value,
                    socialLogin: {
                        isUsed: true,
                        provider: 'GOOGLE',
                        socialId: profile.id
                    }
                });

                return done(null, user);
            } catch (error) {
                return done(error, null);
            }
        }
    )
);

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, id);
    } catch (error) {
        done(error, null);
    }
});

module.exports = passport;

