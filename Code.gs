// ตั้งค่า ID ต่างๆ (แก้ให้ตรงกับของคุณ)
var SHEET_ID = '1wBbN1127iViI_0pXZU2RUoVeuSxQfZsI0qoIgxaaO4s'; // ไอดีของ Google Sheet
var SHEET_NAME = 'DATABASE TARGET'; // ชื่อแท็บของ Sheet

// ชื่อโฟลเดอร์ที่ต้องการให้ระบบสร้างอัตโนมัติใน Google Drive (เปลี่ยนชื่อได้ตามต้องการ)
var MAIN_FOLDER_NAME = 'SmartService_Images';

// ตั้งค่าสำหรับ LINE OA (Messaging API)
var LINE_CHANNEL_ACCESS_TOKEN = '2tNJ9uonYekriWaowXc3gv+mSEER3DJYSxvyuS9/tRnWYTmM7heSy8f1z/uL+07nu1wyf0P1afLoIx2NsOimbfcKnUDyfe43BeqWkLJpYAsWTydXxgWcas0rYtuDZDp3d9TO4b2buN79Xldf9wQCMAdB04t89/1O/w1cDnyilFU='; // ใส่ Channel Access Token ของคุณ
var LINE_GROUP_ID = 'U6299f07e82be6a58c5d5342d281bf156'; // ใส่ Group ID ที่ต้องการให้บอทส่งข้อความไป

// ตั้งค่าสำหรับ Telegram Bot
var TELEGRAM_BOT_TOKEN = '9053573002:AAHZovzwSjReuDpAiZ7eeBoaHetwWFZqSkk'; 
var TELEGRAM_CHAT_ID = '-1004379656642'; // ถ้าเป็นกลุ่ม ID มักจะติดลบ เช่น -123456789

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Smart Service - ระบบแจ้งซ่อมออนไลน์')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ฟังก์ชันสำหรับค้นหาหรือสร้างโฟลเดอร์
function getOrCreateFolder(folderName) {
  var folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next(); // ถ้ามีโฟลเดอร์ชื่อนี้อยู่แล้ว ให้ใช้งานต่อได้เลย
  } else {
    return DriveApp.createFolder(folderName); // ถ้ายังไม่มี ให้สร้างขึ้นมาใหม่ใน My Drive
  }
}

function saveData(obj) {
  try {
    var imageUrl = "-";
    
    // จัดการอัปโหลดไฟล์รูปลง Google Drive (ใช้ระบบสร้างโฟลเดอร์อัตโนมัติ)
    if (obj.imageFile && obj.imageFile.data) {
      // เรียกใช้ฟังก์ชันค้นหาหรือสร้างโฟลเดอร์
      var folder = getOrCreateFolder(MAIN_FOLDER_NAME);
      
      var contentType = obj.imageFile.type;
      var bytes = Utilities.base64Decode(obj.imageFile.data);
      
      // สามารถตั้งชื่อไฟล์รูปใหม่ให้มีวันที่หรือ Serial Number กำกับได้ (ตัวอย่างนี้ใช้ชื่อเดิมที่อัปโหลดมา)
      var blob = Utilities.newBlob(bytes, contentType, obj.imageFile.name);
      
      var file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      imageUrl = file.getUrl();
    }

    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    
    // จัดเรียงข้อมูลตามคอลัมน์ที่กำหนด
    var rowData = [
      obj.hospital,       // A: Hospital
      obj.contactName,    // B: Contact Name
      obj.contactPhone,   // C: Contact Phone
      obj.equipment,      // D: Equipment (ชื่อรุ่น)
      obj.problem,        // E: Problem (อาการเสีย)
      imageUrl,           // F: Image URL
      "",                 // G: (เว้นว่าง)
      "",                 // H: (เว้นว่าง)
      obj.reportDate,     // I: Report Date
      obj.engineer,       // J: Engineer
      obj.serialNumber,   // K: Serial Number
      obj.ibdate,         // L: IB Date
      obj.expirydate      // M: Expiry Date
    ];
    
    sheet.appendRow(rowData);

    // ส่งแจ้งเตือนเข้า LINE OA Group
    sendLineOAMessage(obj, imageUrl);
    // ส่งแจ้งเตือนเข้า Telegram
    sendTelegramNotification(obj, imageUrl);

    return { status: 'success', message: 'บันทึกข้อมูลและแจ้งเตือนเรียบร้อยแล้ว' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

// ฟังก์ชันส่ง LINE
function sendLineOAMessage(obj, imageUrl) {
  if (!LINE_CHANNEL_ACCESS_TOKEN || !LINE_GROUP_ID) return;

  var messageText = "📢 แจ้งซ่อมใหม่ (Smart Service)\n" +
                    "🏥 โรงพยาบาล: " + obj.hospital + "\n" +
                    "👤 ผู้แจ้ง: " + obj.contactName + "\n" +
                    "📞 เบอร์โทร: " + obj.contactPhone + "\n" +
                    "🛠 อุปกรณ์/รุ่น: " + obj.equipment + "\n" +
                    "🔢 Serial Number: " + obj.serialNumber + "\n" +
                    "⚠️ อาการเสีย: " + obj.problem + "\n" +
                    "📅 วันที่แจ้ง: " + obj.reportDate + "\n" +
                    "👨‍🔧 วิศวกรรับผิดชอบ: " + (obj.engineer ? obj.engineer : "-") + "\n" +
                    "🖼 ดูรูปภาพ: " + imageUrl;
  
  var url = "https://api.line.me/v2/bot/message/push";
  var payload = {
    "to": LINE_GROUP_ID,
    "messages": [{
      "type": "text",
      "text": messageText
    }]
  };
  var options = {
    "method": "post",
    "headers": {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + LINE_CHANNEL_ACCESS_TOKEN
    },
    "payload": JSON.stringify(payload)
  };

  try {
    UrlFetchApp.fetch(url, options);
  } catch (e) {
    Logger.log("LINE OA Error: " + e.message);
  }
}

// ฟังก์ชันส่ง Telegram
function sendTelegramNotification(obj, imageUrl) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;

  // จัดข้อความ Telegram (ใช้ <b> เพื่อทำตัวหนา)
  var messageText = "📢 <b>แจ้งซ่อมใหม่ (Smart Service)</b>\n" +
                    "🏥 <b>โรงพยาบาล:</b> " + obj.hospital + "\n" +
                    "👤 <b>ผู้แจ้ง:</b> " + obj.contactName + "\n" +
                    "📞 <b>เบอร์โทร:</b> " + obj.contactPhone + "\n" +
                    "🛠 <b>อุปกรณ์/รุ่น:</b> " + obj.equipment + "\n" +
                    "🔢 <b>Serial Number:</b> " + obj.serialNumber + "\n" +
                    "⚠️ <b>อาการเสีย:</b> " + obj.problem + "\n" +
                    "📅 <b>วันที่แจ้ง:</b> " + obj.reportDate + "\n" +
                    "👨‍🔧 <b>วิศวกรรับผิดชอบ:</b> " + (obj.engineer ? obj.engineer : "-") + "\n" +
                    "🖼 <a href='" + imageUrl + "'>ดูรูปภาพประกอบคลิก</a>";

  var url = "https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/sendMessage";
  var payload = {
    "chat_id": TELEGRAM_CHAT_ID,
    "text": messageText,
    "parse_mode": "HTML"
  };
  var options = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload)
  };

  try {
    UrlFetchApp.fetch(url, options);
  } catch (error) {
    Logger.log("Telegram Error: " + error.message);
  }
}

function testTelegram() {
  var mockObj = {
    hospital: "รพ.ทดสอบ",
    contactName: "นายทดสอบระบบ",
    contactPhone: "0801234567",
    equipment: "เครื่องทดสอบ",
    serialNumber: "SN-99999",
    problem: "ทดสอบการแจ้งเตือน",
    reportDate: "10/11/2026",
    engineer: "ช่าง A"
  };
  sendTelegramNotification(mockObj, "https://script.google.com/macros/s/AKfycbxsUAaSO-aeaLWJRYLCUVziQuuhVZCi95l-EJUUulbNoxE5kq8f2Q6EgK1vDePYfKe-pQ/exec");
}
