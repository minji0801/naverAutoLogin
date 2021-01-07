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

// 네이버 API 예제 - 회원프로필 조회
var express = require('express');
var app = express();
var token = "AAAAOip8bdin-rMccOoaTqVX5f--SoHhXIIjvEgw6iU-YlTJW8xBU6nyi1e8rBL8tuokoek5JPoCUpMXzDMgNijfssg";
var header = "Bearer " + token; // Bearer 다음에 공백 추가

app.get('/member', function (req, res) {
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
            
            res.writeHead(200, { 'Content-Type': 'text/json;charset=utf-8' });
            res.end(body);

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
                                    + birthyear + "', 'accessToken', 'refreshToken');";
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
    console.log('http://127.0.0.1:3000/member app listening on port 3000!');
});
