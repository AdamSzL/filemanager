import express from 'express';
import path from 'path';
import formidable from 'formidable';
import hbs from 'express-handlebars';
import cookieParser from 'cookie-parser';
import sessions from 'express-session';
import users from './users.json';

const __dirname = path.resolve();
const app = express();
const PORT = process.env.PORT || 3000;

let fileData = [];
let currentId = 1;
let session;

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.engine('hbs', hbs({
    extname: '.hbs',
    partialsDir: 'views/partials',
    defaultLayout: 'main.hbs',
}));

app.use(express.static('static'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(sessions({
    secret: '9082157932029080132948173982',
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 },
    resave: false
}));

app.get('/', (req, res) => {
    res.redirect('/upload');
});

app.get('/upload', (req, res) => {
    session = req.session;
    if (session.userid) {
        res.render('upload.hbs');
    } else {
        res.redirect('/login');
    }
});

app.post('/upload', (req, res) => {
    let form = formidable({});
    form.keepExtensions = true;
    form.multiples = true;
    form.uploadDir = __dirname + '/static/upload/'
    form.parse(req, (err, fields, files) => {
        const fileList = files['files'];
        if (Array.isArray(fileList)) {
            for (let i = 0; i < fileList.length; i++) {
                fileList[i]['id'] = currentId++;
                fileList[i]['lastModified'] = fileList[i].lastModifiedDate.getTime();
                insertFileIcon(fileList[i]);
                fileData.push(fileList[i]);
            }
        } else {
            fileList['id'] = currentId++;
            fileList['lastModified'] = fileList.lastModifiedDate.getTime();
            insertFileIcon(fileList);
            fileData.push(fileList);
        }
        res.redirect('/filemanager');
    });
});

app.get('/filemanager', (req, res) => {
    session = req.session;
    if (session.userid) {
        res.render('filemanager.hbs', { 'files': fileData });
    } else {
        res.redirect('/login');
    }
});

app.post('/filemanager', (req, res) => {
    const action = req.body.action;
    const id = parseInt(req.body.id);
    if (action === 'DOWNLOAD') {
        const fileToDownload = (fileData.filter(file => file.id === id))[0];
        res.download(fileToDownload.path, fileToDownload.name);
    } else if (action === 'DELETE') {
        fileData = fileData.filter(file => file.id !== id);
        res.render('filemanager.hbs', { 'files': fileData });
    }
});

app.get('/info', (req, res) => {
    session = req.session;
    if (session.userid) {
        const id = req.query.id;
        let fileToSend;
        fileData.forEach(file => {
            if (file.id === parseInt(id)) {
                fileToSend = file;
            }
        });
        res.render('info.hbs', fileToSend);
    } else {
        res.redirect('/login');
    }
});

app.get('/reset', (req, res) => {
    fileData = [];
    res.redirect('/filemanager');
});

app.get('/login', (req, res) => {
    res.render('login.hbs');
});

app.post('/login', (req, res) => {
    let validData = false;
    users.forEach(user => {
        if (user.username === req.body.username && user.password === req.body.password) {
            validData = true;
        }
    });
    if (validData) {
        session = req.session;
        session.userid = req.body.username;
        res.redirect('/filemanager');
    } else {
        res.send('Invalid username or password');
    }
});

app.listen(PORT, () => {
    console.log(`Start serwera na porcie ${PORT}`);
});

function getFileType(filename) {
    let chunks = filename.split('.');
    return chunks[chunks.length - 1];
}

function insertFileIcon(file) {
    let fileType = getFileType(file.name);
    if (['jpg', 'png', 'txt', 'pdf'].includes(fileType)) {
        file['icon'] = `gfx/${getFileType(file.name)}-icon.png`;
    } else {
        file['icon'] = `gfx/unknown-icon.png`;
    }
}