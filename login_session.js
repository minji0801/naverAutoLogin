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

var express = require('express');
var session = require('express-session');
var FileStore = require('session-file-store')(session);
var cookieParser = require('cookie-parser');
var app = express();

var client_id = 'vr7RKaMpbm1thc6MSCUl';
var client_secret = 'FhQFTmrl1X';
var state = "RAMDOM_STATE";
var redirectURI = encodeURI("http://127.0.0.1:3000/callback");
var api_url = "";

app.use(cookieParser());
app.use(session({               // 세션적용
    secret: 'keyboard cat',     // 세션 암호화(필수)
    resave: false,              // 항상 저장할지(false권장)
    saveUninitialized: true,    // 초기화되지 않은채 저장
    store: new FileStore()      // 데이터 저장형식
}));

app.set('view engine', 'ejs');

var _accessToken;
var _refreshToken;

app.get('/naverlogin', function (req, res) {
    console.log('naverlogin');
    api_url = 'https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=' + client_id + '&redirect_uri=' + redirectURI + '&state=' + state;

    console.log(req.session);
    console.log(req.cookies);

    // 들어오자마자 바로 세션에 토큰이 있는지 확인
    var checkingAccessToken = req.session.accessToken;
    var checkingRefreshToken = req.session.refreshToken;
    console.log(checkingAccessToken);
    console.log(checkingRefreshToken);

    // MSSQL에 해당 토큰이 있는지 확인
    mssql.connect(config, function (err) {
        console.log('mssql connect');
        var mssqlRequest = new mssql.Request();
        var queryString = "EXEC p_SLI '" + checkingAccessToken + "', '" + checkingRefreshToken + "'";
        mssqlRequest.query(queryString, function (err, result) {
            var returnData = result.recordset;
            console.log(returnData[0].p_result);
            if (returnData[0].p_result == '자동로그인') {
                // accessToken, refreshToken 모두 있는 경우(데이터 있음)
                console.log('There is');

                // 자동로그인
                res.redirect('/welcome');

            } else if (returnData[0].p_result == '사용자등록') {
                // refreshToken 없는 경우(데이터 없음)
                console.log('None');
                res.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' });
                res.end("<a href='" + api_url + "'><img height='50' src='http://static.nid.naver.com/oauth/small_g_in.PNG'/></a>");
            }
        })
    })
});

// 토큰 조회
app.get('/callback', function (req, res) {
    console.log('callback');
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

            res.redirect('/member');
            /* res.writeHead(200, { 'Content-Type': 'text/json;charset=utf-8' });
            res.end(body); */
        } else {
            res.status(response.statusCode).end();
            console.log('error = ' + response.statusCode);
        }
    });
});

// 사용자 정보 조회, MSSQL 데이터 INSERT
app.get('/member', function (req, res) {
    console.log('memeber');
    var loginAccessToken = _accessToken;
    var header = "Bearer " + loginAccessToken; // Bearer 다음에 공백 추가

    // 세션에 토큰 넣기
    req.session.accessToken = _accessToken;
    req.session.refreshToken = _refreshToken;
    console.log(req.session);   // req.session -> 세션 사용
    req.session.save();

    var api_url = 'https://openapi.naver.com/v1/nid/me';
    var request = require('request');
    var options = {
        url: api_url,
        headers: { 'Authorization': header }
    };
    request.get(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var obj = JSON.parse(body);

            // 프로필 정보 가져오기
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

            /* res.writeHead(200, { 'Content-Type': 'text/json;charset=utf-8' });
            res.end(JSON.stringify(obj)); */

            // MSSQl에 프로필정보 저장
            mssql.connect(config, function (err) {
                console.log('mssql connect');
                var mssqlRequest = new mssql.Request();
                var queryString = "EXEC p_SLI '" + _accessToken + "', '" + _refreshToken + "'";
                mssqlRequest.query(queryString, function (err, result) {
                    var returnData = result.recordset;
                    console.log(returnData[0].p_result);
                    if (returnData[0].p_result == '자동로그인') {
                        console.log('There is');

                        // 자동로그인
                        res.redirect('/welcome');

                    } else if (returnData[0].p_result == '업데이트') {
                        console.log('accessToken update');

                        // accessToken update
                        var updateQuery = "EXEC p_SLI_U '" + _accessToken + "', '" + _refreshToken + "', '" + fmDate.toLocaleString() + "'";
                        mssqlRequest.query(updateQuery, function (err, updateResult) {
                            var returnData = result.recordset;
                            console.log(returnData);

                            req.session.accessToken = _accessToken;

                            // 자동로그인
                            res.redirect('/welcome');
                        });

                    } else if (returnData[0].p_result == '사용자등록') {
                        console.log('Insert');
                        var insertQuery = "INSERT INTO tSLI VALUES ('"
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
                        mssqlRequest.query(insertQuery, function (err, insertResult) {
                            console.log('OK');
                            res.redirect('/welcome');
                        })
                    }
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

app.get('/welcome', function (req, res) {
    res.render('welcome');
});

// 로그아웃 처리
app.post('/welcome', function (req, res) {
    // 세션삭제
    req.session.destroy();
    res.redirect('/naverlogin');
});

app.listen(3000, function () {
    console.log('http://127.0.0.1:3000/naverlogin app listening on port 3000!');
});