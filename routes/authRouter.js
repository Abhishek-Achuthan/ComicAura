const express = require('express');
const router = express.Router();
const passport = require('passport');


router.get('/google',
    passport.authenticate('google', { 
        scope: ['profile', 'email'],
        prompt: 'select_account'
    })
);

router.get('/google/callback',
    passport.authenticate('google', {
        failureRedirect: '/login',
        failureFlash: true
    }),
    (req, res) => {
        res.redirect('/');
    }
);


router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.redirect('/');
        }
        res.redirect('/');
    });
});

module.exports = router;
