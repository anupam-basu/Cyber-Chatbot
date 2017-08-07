'use strict';

const aws = require('aws-sdk');
var AWS = require('aws-sdk');
var env = process.env;
var fetch=require("node-fetch");
const lambda = new aws.Lambda();
const S3BUCKET=AWS.S3.BUCKET;

const botBuilder = require('claudia-bot-builder');
const promiseDelay = require('promise-delay');
const slackDelayedReply = botBuilder.slackDelayedReply;
const vt = require('node-virustotal');
const path = require('path');
const   _ = require('underscore');

var qav="av "; //according to the av
let qvirus ="virus";
let qconfidence ="confidence";
let qreport = "report";
let qfamily ="family";
let qavsay="avsay"; //antivirus list that says it is a virus

let replynotvirus="This is not a virus";
var replyvirus="Alert: This file is a virus according to ";
var replyav="Alert: This file is a virus according to ";
var replyreport="Detail Report:\nThis file is a virus according to ";
var replyavlist ="Virus Alert: This file is a virus according to the following Antivirus:\n";
var replydontknow="Sorry I do not understand this question, please try again."
var replynotav="This file is not a virus according to ";
var replyFileNotFound="This file was not found in VirusTotal";
var hash=""; //global variable
var file_data = "";
var last_file="";
const fs=require('fs');
//const dir="./files_uploaded";
const dir="/tmp";
var files ="";
var fullpath ="";
 
var filelist=new Array(); 
var userID="";
var tempUser = "";
var fileliststr = "NULL";

var taguser="";

function botdelay(){
const api = botBuilder((message, apiRequest) => {
  //hash=message.text;
  return lambda.invoke({
    FunctionName: apiRequest.lambdaContext.functionName,
    Qualifier: apiRequest.lambdaContext.functionVersion,
    InvocationType: 'Event',
    Payload: JSON.stringify({
      slackEvent: message // this will enable us to detect the event later and filter it
    })
  })
    .promise()
    .then(() => {
      return { 
        text: 'checking...',
        response_type: 'in_channel',
      }
    }).catch(() => {
      return 'error........'
    });
});

api.intercept((event) => {
  if (!event.slackEvent) // if this is a normal web request, let it run
    return event;

    const message = event.slackEvent;
    console.log("message"+message);	
    const str = message.text;
    console.log("string"+str);
    hash="";
    file_data="";
    last_file="";
    files ="";
    var fullpath="";


    userID=message.sender;
    hash=getHash(str,userID);
    console.log("abhijeetHash"+hash);

    var question=questiontype(str);
   
    const con = vt.MakePublicConnection();
    con.setKey('e8c926d71eea9f24896f741f679295593bda6232881c5d64015dee50f801b063');
    var s="";
    //var detailreport="";
    let ans = 'not';
    // getFileReport seems to be async so we need to wrap it in promise
    return new Promise((resolve, reject) => {
    con.getFileReport(hash, data => {
	//response=JSON.parse(data);
	for(var key in data){
		var val=data[key];
		//console.log("key"+key);
		if(key=="scans")  
  	for(var k in val){
    		if(val[k]["detected"]==true){
    			s=s+k+"\n";
    		}
    	}
	}
      
      console.log(hash+"abhijeet");
      console.log("abhijeet"+s);
      resolve(data);
    }, mistake => {
        console.log("abhijeet"+JSON.stringify(mistake));
        reject(replyFileNotFound);
      });
    })
      .then(data => { // Data from resolve
        return slackDelayedReply(event.slackEvent, {
          text: replytoquestion(s , data, question),
	  response_type: 'in_channel'
        //  channel:"testcyberchatbot",
        // parse:"full",
        // link_names:"1"
        })
      })
      .catch(err => { // Mistake from reject
        return slackDelayedReply(event.slackEvent, {
          text: JSON.stringify(err)
        })
      })
      .then(() => false);
})

module.exports=api;
}
function sendMessage(question){
	var channel="abhisri";
	var RtmClient = require('@slack/client').RtmClient;
	var CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;

	var bot_token = process.env.SLACK_BOT_TOKEN || '';

	var rtm = new RtmClient(bot_token);

	// The client will emit an RTM.AUTHENTICATED event on successful connection, with the `rtm.start` payload if you want to cache it
	rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, function (rtmStartData) {
	  console.log(`Logged in as ${rtmStartData.self.name} of team ${rtmStartData.team.name}, but not yet connected to a channel`);
	});

	// you need to wait for the client to fully connect before you can send messages
	rtm.on(CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, function () {
	  rtm.sendMessage(question, channel);
	});

	rtm.start();

}
function replytoquestion(str , data, qtype){
  //str contains antivirus list and data is the whole json
  //qtype is the question type
  console.log("data"+data);
  replynotvirus=replynotvirus+" "+taguser;
  if(qtype==qvirus){
      if(str=="")
        return replynotvirus;
      else return replyvirus + data["positives"]+" antivirus"; 
    }
    if(qtype==qreport)
      return replyreport +
    +data["positives"]+" antivirus\nMore detail can be found here\n"+data["permalink"];
    if(qtype==qavsay)
      return replyavlist+str;
    console.log(qtype+" abhijeet " + qtype.includes(qav));
    console.log("0  "+qtype.split(" ")[0]);
    if(qtype.includes(qav)){
      var avname=qtype.split(" ")[1];
      console.log(avname);
      console.log(str.toLowerCase().includes(avname.toLowerCase()));
      if(str.toLowerCase().includes(avname.toLowerCase()))
        return replyav+avname;
      else return replynotav + avname;
    }  
    return replydontknow +" You can try checking flask slash command";
}

function questiontype( sent)
{
  var natural = require('natural'),
    tokenizer = new natural.WordPunctTokenizer();
  var corpus = ["mcafee","does","scan","confidence","malware","virus","everything","family","category","detail","antivirus","bkav","totaldefense","microWorld-escan","nprotect","cmc","cat-quickheal","alyac","malwarebytes","zillya","aegislab","thehacker","alibaba","k7gw","k7antivirus","arcabit","baidu","f-prot","symantec","eset-nod32","trendmicro-housecall","avast","clamav","kaspersky","bitdefender","nano-antivirus","superantispyware","ad-aware","emsisoft","comodo","f-secure","drweb","vipre","trendmicro","sophos","cyren","jiangmin","avira","antiy","kingsoft","microsoft","virobot","gdata","ahnlab-v3","mcafee","avware","vba32","zoner","tencent","yandex","ikarus","fortinet","avg","panda","qihoo"];
  console.log("input:\n");
  var spellcheck = new natural.Spellcheck(corpus);
  var spelltry="Mcaffee";
  console.log(sent);
  var sentence=tokenizer.tokenize(sent);
  var temp="";
  for (var key in sentence)
  {
  
          var spell=spellcheck.getCorrections(sentence[key].toLowerCase(),1);
          if (spell.length!=0)
          {       
                  sentence[key]=spell[0];
          }
  }
  console.log(sentence);

  var isvirus=" malware virus safe open concern clean ";
  var confidence= " confidence ";
  var report=" everything report detail more else ";
  var av=" Mcafee Bkav TotalDefense MicroWorld-eScan nProtect CMC CAT-QuickHeal ALYac Malwarebytes Zillya AegisLab TheHacker Alibaba K7GW K7AntiVirus Arcabit Baidu F-Prot Symantec ESET-NOD32 TrendMicro-HouseCall Avast ClamAV Kaspersky BitDefender NANO-Antivirus SUPERAntiSpyware Ad-Aware Emsisoft Comodo F-Secure DrWeb VIPRE TrendMicro McAfee-GW-Edition Sophos Cyren Jiangmin Avira Antiy-AVL Kingsoft Microsoft ViRobot GData AhnLab-V3 McAfee AVware VBA32 Zoner Tencent Yandex Ikarus Fortinet AVG Panda Qihoo-360 ";
  var family=" family category ";
  var avsay=" antivirus list ";

  var reportCount=0,familyCount=0,isvirusCount=0,avsayCount=0;
  for (var key in sentence){
    var word=sentence[key].toLowerCase();
    if(av.toLowerCase().includes(" "+word+" ")){
      console.log("this is av question for " + word);
      return qav+word ;
    }
    if(confidence.includes(" "+word+" ")){
      console.log("this is a confidence question");
      return qconfidence;
    }
    if(report.includes(" "+word+" "))reportCount++;
    if(family.includes(" "+word+" "))familyCount++;
    if(isvirus.includes(" "+word+" "))isvirusCount++;
    if(avsay.includes(" "+word+" "))avsayCount++;
  }
  if(reportCount > 0) {
    console.log("this is a report question");
    return qreport;
  }
  else if(familyCount > 0){
    console.log("this is a family question");
    return qfamily;
  }
  else if(avsayCount>0 ){
    console.log("this is a avsay question");
    return qavsay;
  }
  else {
    console.log("this is a virus question");
    return qvirus;
  }
}
function isFileName(word){
  var patt = new RegExp(/[0-9a-z]+\.[a-z]+$/i);
    var res = patt.test(word);
    console.log("isFileName==="+word+" "+res);
    if(res==true){
      return word; 
    }
    else return "";
}
function getHashFromString(word) {
    var patt = new RegExp("((^[0-9]+[a-z]+)|(^[a-z]+[0-9]+))[0-9a-z]+");
    var res = patt.test(word);

    if(res==true){
      return word; 
    }
    else return "";
}
function getHashFromFile(filename){
    var file_in_s3 =filename;
    var env = process.env;
    console.log("filename "+filename);
    var s3 = new aws.S3({accessKeyId: env.AWS_ID, secretAccessKey:env.AWS_KEY});
        s3 = new aws.S3({apiVersion: '2006-03-01'});
    var s3param={
                Bucket: S3BUCKET,
                Key    : userID+"_"+file_in_s3};
var userHash='';
return new Promise((resolve, reject) => {
        s3.getObject(s3param,function(err,data){
        if (err)
        { 
        console.log(err);
        console.log("\nNot found, hence aborted");
        reject("Error");
        }
        else
        {    
         userHash =userHash+require("crypto").createHash('sha256').update(data.Body).digest('hex');
                console.log("Userhash: "+userHash);
                hash = userHash;
                resolve(hash); 
        }
        });
}).then(data=>data).catch((err) => console.error(err));
}   
function getHash(sent,userID){
  
  console.log(sent);
  var sentence=sent.split(' ');
  var temp="";
  var filename="last";
  var key;
  console.log("sentence=="+sent);
  for (key=0;key<sentence.length;key++)
  {
	if(isUser(sentence[key]!="")){
		taguser="<"+sentence[key]+">";
	}
    temp=getHashFromString(sentence[key]);
    if(temp!=""){
      hash=temp;
      break;
    }
    else if(sentence[key]=="last"){
      filename="last";
      break;
    }
    else if(isFileName(sentence[key])!=""){
      filename=sentence[key];
      break;
    }
	
  }
  console.log("tokens:hash"+hash);
  console.log(sentence);

  if(hash==""){
    if(filename!="last"){
      getHashFromFile("chatbot");
    }
    else{
      //getFileListFromS3();
      getHashFromFile(filename);
    } 
  }
  return hash;
}
//gets the list of files from S3 start
function getFileListFromS3()
{
    filelist.length = 0;
    getFileListFromS3operation();
    console.log(tempUser+" is the temp user");
    console.log(userID+" is the current user");
    if (tempUser != userID)
    {
            console.log("in condition for timeout");
    //        getFileListFromS3();
            setTimeout(function(){ console.log("in time out"); }, 4000);

    }
    if(fileliststr=='' || tempUser != userID)
        fileliststr="NULL";
    filelist.length = 0;
}
function getFileListFromS3operation()
{
    filelist.length=0;
    var s3 = new aws.S3({accessKeyId: env.AWS_ID, secretAccessKey:env.AWS_KEY,region:"us-east-2"});
        s3 = new aws.S3({apiVersion: '2006-03-01'});
    var params = { 
        Bucket: S3BUCKET
    };
    console.log("in get list back");

        console.log("in promise");
        return s3.listObjectsV2(params, function (err, data) {
        tempUser = userID;
        var search = tempUser;
        console.log(tempUser);
        fileliststr="";
        var arrlist = new Array();
        console.log("in s3 async");
        if(err)
        {
                console.log(err);
        }
        else{
            filelist.length = 0;
            console.log("in s3 no error");
            for (var i = 0; i<data.Contents.length ; i++)
            {
                if(data.Contents[i].Key.includes(search))
                arrlist.push(data.Contents[i]);
            }
            orderingLastUpdatedFile(arrlist);
        }
    }).promise();
}
function orderingLastUpdatedFile(arrlist)
{
    console.log("ordering");
    console.log(tempUser);
    arrlist.sort(function (a,b){
                        return b.LastModified-a.LastModified;
                });
                for(var i=0;i<arrlist.length;i++)
                {
        //                console.log(arrlist[i].Key.substring(10));
                        filelist.push(arrlist[i].Key.substring(10));
                }
    fileliststr = filelist.join(" ");
    filelist.length = 0;
}
//get file list from S3 End
function isUser(word) {
    var patt = new RegExp(/@[0-9a-zA-Z]*$/i);
    var res = patt.test(word);

    if(res==true){
      return word; 
    }
    else return "";
}
botdelay();
