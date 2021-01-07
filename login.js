const mssql = require('mssql');
const config = {
    "user": "sa",
    "password": "qw12qw12",
    "server": "192.168.0.134",
    "port": 1433,
    "database": "aTEST",
    "options": {
        encrypt: false, // Use this if you're on Windows Azure 
        enableArithAbort: true
    }
}

var http = require('http');
var express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
var cookieParser = require('cookie-parser');
var app = express();

var client_id = 'vr7RKaMpbm1thc6MSCUl';
var client_secret = 'FhQFTmrl1X';
var state = "RAMDOM_STATE";
var redirectURI = encodeURI("http://127.0.0.1:3000/callback");
var api_url = "";
var token = "AAAAOip8bdin-rMccOoaTqVX5f--SoHhXIIjvEgw6iU-YlTJW8xBU6nyi1e8rBL8tuokoek5JPoCUpMXzDMgNijfssg";
var header = "Bearer " + token; // Bearer 다음에 공백 추가

app.use(cookieParser())
app.use(session({               // 세션적용
    secret: 'keyboard cat',     // 세션 암호화(필수)
    resave: false,              // 항상 저장할지(false권장)
    saveUninitialized: true,    // 초기화되지 않은채 저장
    store: new FileStore()      // 데이터 저장형식
}));

var _accessToken;
var _refreshToken;

app.get('/naverlogin', function (req, res) {
    api_url = 'https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=' + client_id + '&redirect_uri=' + redirectURI + '&state=' + state;
    res.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' });
    res.end("<a href='" + api_url + "'><img height='50' src='http://static.nid.naver.com/oauth/small_g_in.PNG'/></a>");

    // 들어오자마자 바로 세션에 accessToken 있는지 확인
    var checkingAccessToken = req.session.accessToken;
    console.log(checkingAccessToken);

    // MSSQL에 해당 accessToken 있는지 확인
    mssql.connect(config, function (err) {
        console.log('mssql connect');
        var mssqlRequest = new mssql.Request();
        var queryString = "SELECT * FROM tSLI WHERE accessToken = '" + checkingAccessToken + "'";
        mssqlRequest.query(queryString, function (err, result) {
            var returnData = result.recordset;
            if(returnData.length > 0) {
                console.log('There is');

                // /member로 이동

            } else {
                console.log('None');
            }
        })
    })
});

app.get('/callback', function (req, res) {
    code = req.query.code;
    state = req.query.state;
    api_url = 'https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id='
        + client_id + '&client_secret=' + client_secret + '&redirect_uri=' + redirectURI + '&code=' + code + '&state=' + state;
    var request = require('request');
    var options = {
        url: api_url,
        headers: { 'X-Naver-Client-Id': client_id, 'X-Naver-Client-Secret': client_secret }
    };
    request.get(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var obj = JSON.parse(body);

            _accessToken = obj.access_token;
            _refreshToken = obj.refresh_token;

            res.writeHead(200, { 'Content-Type': 'text/json;charset=utf-8' });
            res.end(body);
        } else {
            res.status(response.statusCode).end();
            console.log('error = ' + response.statusCode);
        }
    });
});

app.get('/member', function (req, res) {
    //req.session.destroy();
    req.session.id =
        req.session.accessToken = _accessToken;
    req.session.refreshToken = _refreshToken;
    console.log(req.session);   // req.session -> 세션 사용

    var api_url = 'https://openapi.naver.com/v1/nid/me';
    var request = require('request');
    var options = {
        url: api_url,
        headers: { 'Authorization': header }
    };
    request.get(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var obj = JSON.parse(body);

            var id = obj.response.id;
            var nickname = obj.response.nickname;
            var profile_image = obj.response.profile_image;
            var age = obj.response.age;
            var gender = obj.response.gender;
            var email = obj.response.email;
            var mobile = obj.response.mobile;
            var mobile_e164 = obj.response.mobile_e164;
            var name = obj.response.name;
            var birthday = obj.response.birthday;
            var birthyear = obj.response.birthyear;
            var fmDate = new Date();

            res.writeHead(200, { 'Content-Type': 'text/json;charset=utf-8' });
            res.end(JSON.stringify(obj));

            // MSSQl에 프로필정보 저장
            mssql.connect(config, function (err) {
                console.log('mssql connect');
                var mssqlRequest = new mssql.Request();
                var queryString = "INSERT INTO tSLI VALUES ('"
                    + id + "', '"
                    + nickname + "', '"
                    + profile_image + "', '"
                    + age + "', '"
                    + gender + "', '"
                    + email + "', '"
                    + mobile + "', '"
                    + mobile_e164 + "', '"
                    + name + "', '"
                    + birthday + "', '"
                    + birthyear + "', '"
                    + _accessToken + "', '"
                    + _refreshToken + "', '"
                    + fmDate.toLocaleString() + "');";
                mssqlRequest.query(queryString, function (err, result) {
                    console.log('OK');
                })
            })
        } else {
            console.log('error');
            if (response != null) {
                res.status(response.statusCode).end();
                console.log('error = ' + response.statusCode);
            }
        }
    });
});

app.listen(3000, function () {
    console.log('http://127.0.0.1:3000/naverlogin app listening on port 3000!');
});