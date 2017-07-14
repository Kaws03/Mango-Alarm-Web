// Copyright � 2002-2010 Microchip Technology Inc.  All rights reserved.
// See Microchip TCP/IP Stack documentation for license information.

document.getElementById("defaultOpen").click();
getSensors();

// Determines when a request is considered "timed out"
const timeOutMS = 5000; // ms

// Stores a queue of AJAX events to process
let ajaxList = [];

const LED_NAMES = [
	'ledAlarmStatus',
	'ledAC',
	'ledTemp1',
	'ledTemp2',
	'ledTemp3',
	'ledTemp4',
	'ledWater1',
	'ledWater2',
	'ledWater3',
	'ledWater4',
	'ledSmoke1',
	'ledSmoke2',
	'ledSmoke3',
	'ledSmoke4'
];

const BUTTONS_NAMES = [
	'ledAlarmEnabled',
	'ledPump1',
	'ledPump2',
	'ledPLC'
];

const TEMP_NAMES = [
	'temp1',
	'temp2',
	'temp3',
	'temp4',
];


// Initiates a new AJAX command
//	url: the url to access
//	container: the document ID to fill, or a function to call with response XML (optional)
//	repeat: true to repeat this call indefinitely (optional)
//	data: an URL encoded string to be submitted as POST data (optional)
function newAJAXCommand(url, container, repeat, data) {
	// Set up our object
	let newAjax = {};
	let theTimer = new Date();

	newAjax.url = url;
	newAjax.container = container;
	newAjax.repeat = repeat;
	newAjax.ajaxReq = null;

	// Create and send the request
	if (window.XMLHttpRequest) {
		newAjax.ajaxReq = new XMLHttpRequest();
		newAjax.ajaxReq.open(!data ? "GET" : "POST", newAjax.url, true);
		newAjax.ajaxReq.send(data);
		// If we're using IE6 style (maybe 5.5 compatible too)
	} else if (window.ActiveXObject) {
		newAjax.ajaxReq = new ActiveXObject("Microsoft.XMLHTTP");
		if (newAjax.ajaxReq) {
			newAjax.ajaxReq.open(!data ? "GET" : "POST", newAjax.url, true);
			newAjax.ajaxReq.send(data);
		}
	}

	newAjax.lastCalled = theTimer.getTime();

	// Store in our array
	ajaxList.push(newAjax);
}

function postIp() {
    // Set up our object
    let newAjax = {};
    let theTimer = new Date();
    
    newAjax.url = "network.cgi";
    newAjax.repeat = false;
    newAjax.ajaxReq = null;
    
    // Create and send the request
    if (window.XMLHttpRequest) {
        newAjax.ajaxReq = new XMLHttpRequest();
        newAjax.ajaxReq.open("POST", newAjax.url, true);
        newAjax.ajaxReq.send(data);
        // If we're using IE6 style (maybe 5.5 compatible too)
    } else if (window.ActiveXObject) {
        newAjax.ajaxReq = new ActiveXObject("Microsoft.XMLHTTP");
        if (newAjax.ajaxReq) {
            newAjax.ajaxReq.open("POST", newAjax.url, true);
            newAjax.ajaxReq.send(data);
        }
    }
    
    newAjax.lastCalled = theTimer.getTime();
    
    // Store in our array
    ajaxList.push(newAjax);
}

// Loops over all pending AJAX events to determine if any action is required
function pollAJAX() {
	let curAjax = {};
	let theTimer = new Date();
	let elapsed;

	// Read off the ajaxList objects one by one
	for (i = ajaxList.length; i > 0; i--) {
		curAjax = ajaxList.shift();
		if (!curAjax)
			continue;
		elapsed = theTimer.getTime() - curAjax.lastCalled;

		// If we succeeded
		if (curAjax.ajaxReq.readyState === 4 && curAjax.ajaxReq.status === 200) {
			// If it has a container, write the result
			if (typeof(curAjax.container) === 'function') {
				curAjax.container(curAjax.ajaxReq.responseXML.documentElement);
			} else if (typeof(curAjax.container) === 'string') {
				document.getElementById(curAjax.container).innerHTML = curAjax.ajaxReq.responseText;
			} // (otherwise do nothing for null values)

			curAjax.ajaxReq.abort();
			curAjax.ajaxReq = null;

			// If it's a repeatable request, then do so
			if (curAjax.repeat)
				newAJAXCommand(curAjax.url, curAjax.container, curAjax.repeat);
			continue;
		}

		// If we've waited over 1 second, then we timed out
		if (elapsed > timeOutMS) {
			// Invoke the user function with null input
			if (typeof(curAjax.container) === 'function') {
				curAjax.container(null);
			} else {
				// Alert the user
				alert("Command failed.\nConnection to development board was lost.");
			}

			curAjax.ajaxReq.abort();
			curAjax.ajaxReq = null;

			// If it's a repeatable request, then do so
			if (curAjax.repeat)
				newAJAXCommand(curAjax.url, curAjax.container, curAjax.repeat);
			continue;
		}

		// Otherwise, just keep waiting
		ajaxList.push(curAjax);
	}

	// Call ourselves again in 10 ms
	setTimeout("pollAJAX()", 10);
}

// Parses the xmlResponse returned by an XMLHTTPRequest object
//	xmlData: the xmlData returned
//  field: the field to search for
function getXMLValue(xmlData, field) {
	try {
		if (xmlData.getElementsByTagName(field)[0].firstChild.nodeValue)
			return xmlData.getElementsByTagName(field)[0].firstChild.nodeValue;
		else
			return null;
	} catch (err) {
		return null;
	}
}

/**
 * this shit is to update your html
 */
function updateView(xmlData) {
	LED_NAMES.forEach(name => {
		const element = document.querySelector(`[data-indicator-name=${name}]`);
		const value = getXMLValue(xmlData, name);

		element.classList.remove('is-ok', 'is-not-ok');
		element.classList.add(value === 'on' ? 'is-not-ok' : 'is-ok');
	});

	TEMP_NAMES.forEach(name => {
		const element = document.querySelector(`[data-temp-name=${name}]`);

		element.innerHTML = getXMLValue(xmlData, name);
	});

	BUTTONS_NAMES.forEach(name => {
		const element = document.querySelector(`[data-button-name=${name}]`);
		const value = getXMLValue(xmlData, name);

		element.innerHTML = value;
		element.classList.remove('is-ok', 'is-not-ok');
		element.classList.add(value === 'on' ? 'is-ok' : 'is-not-ok');
	});

	const logsElement = document.querySelector('[data-system-logs]');
    
    var eventLog = '';
    
    for(var i=1; i<=20; i++){
        if(getXMLValue(xmlData, 'eventLog'+i) != " "){
        eventLog += getXMLValue(xmlData, 'eventLog'+i) + '<br />';
        }
    }
    
    logsElement.innerHTML = eventLog;
}

function setLabels(xmlData) {
    for(var i=1; i<=4; i++){
        str = 'digitalLabel' + i;
        str = getXMLValue(xmlData, str);
        document.getElementById('water' + i).innerText = str;
    }
    
    for(var i=1; i<=4; i++){
        str = 'digitalLabel' + (i+4);
        str = getXMLValue(xmlData, str);
        document.getElementById('smoke' + i).innerText = str;
    }
    
    for(var i=1; i<=4; i++){
        str = 'analogLabel' + (i);
        str = getXMLValue(xmlData, str);
        document.getElementById('temp' + i).innerText = str;
    }
}

function getSensors(xmlData) {
    var str;
    
    
    for(var i=1; i<=8; i++){
        str = 'digitalLabel' + i;
        str = getXMLValue(xmlData, str);
        document.getElementById('DigitalLabel' + i).value = str;
    }
    
    for(var i=1; i<=4; i++){
        str = getXMLValue(xmlData, 'analogLabel' + i);
        document.getElementById('AnalogLabel' + i).value = str;
    }
    
    for(var i=1; i<=4; i++){
        str = getXMLValue(xmlData, 'analogCoef' + i);
        document.getElementById('AnalogCoef' + i).value = str;
    }
    
    for(var i=1; i<=4; i++){
        str = getXMLValue(xmlData, 'analogOffset' + i);
        document.getElementById('AnalogOffs' + i).value = str;
    }
    
    for(var i=1; i<=4; i++){
        str = getXMLValue(xmlData, 'analogWarning' + i);
        document.getElementById('AnalogWarn' + i).value = str;
    }
}

function setSensors(group) {
    if (group == 1){
        var str1 = document.getElementById('DigitalLabel1').value;
        var str2 = document.getElementById('DigitalLabel2').value;
        var str3 = document.getElementById('DigitalLabel3').value;
        var str4 = document.getElementById('DigitalLabel4').value;
        
        if(str1.length <= 7 && str2.length <= 7 && str3.length <= 7 && str4.length <= 7){
            
        }
        else{
            alert("Labels should be less then 8 symbols!");
            return;
        }
        
        var command = 'digLabels1.cgi?lab1='+str1+'&lab2='+str2+'&lab3='+str3+'&lab4='+str4;
        newAJAXCommand(command);
    }
    
    if (group == 2){
        var str1 = document.getElementById('DigitalLabel5').value;
        var str2 = document.getElementById('DigitalLabel6').value;
        var str3 = document.getElementById('DigitalLabel7').value;
        var str4 = document.getElementById('DigitalLabel8').value;
        
        if(str1.length <= 7 && str2.length <= 7 && str3.length <= 7 && str4.length <= 7){
            
        }
        else{
            alert("Labels should be less then 8 symbols!");
            return;
        }
        
        var command = 'digLabels2.cgi?lab5='+str1+'&lab6='+str2+'&lab7='+str3+'&lab8='+str4;
        newAJAXCommand(command);
    }
    
    if (group == 3){
        var str1 = document.getElementById('AnalogLabel1').value;
        var str2 = document.getElementById('AnalogLabel2').value;
        var str3 = document.getElementById('AnalogLabel3').value;
        var str4 = document.getElementById('AnalogLabel4').value;
        
        if(str1.length <= 7 && str2.length <= 7 && str3.length <= 7 && str4.length <= 7){
            
        }
        else{
            alert("Labels should be less then 8 symbols!");
            return;
        }
        
        var command = 'anLabels.cgi?lab9='+str1+'&lab10='+str2+'&lab11='+str3+'&lab12='+str4;
        newAJAXCommand(command);
    }
    
    if (group == 4){
        var str1 = document.getElementById('AnalogCoef1').value;
        var str2 = document.getElementById('AnalogCoef2').value;
        var str3 = document.getElementById('AnalogCoef3').value;
        var str4 = document.getElementById('AnalogCoef4').value;
        
        if(isNaN(str1) == false && isNaN(str1) == false && isNaN(str1) == false && isNaN(str1) == false) {
            
        }
        
        else{
            alert("Invalid number!");
            return;
        }
        
        var command = 'anCoefs.cgi?val1='+str1+'&val2='+str2+'&val3='+str3+'&val4='+str4;
        newAJAXCommand(command);

    }
    
    if (group == 5){
        var str1 = document.getElementById('AnalogOffs1').value;
        var str2 = document.getElementById('AnalogOffs2').value;
        var str3 = document.getElementById('AnalogOffs3').value;
        var str4 = document.getElementById('AnalogOffs4').value;
        
        if(isNaN(str1) == false && isNaN(str1) == false && isNaN(str1) == false && isNaN(str1) == false) {
            
        }
        
        else{
            alert("Invalid number!");
            return;
        }
        
        var command = 'anOffsets.cgi?val1='+str1+'&val2='+str2+'&val3='+str3+'&val4='+str4;
        newAJAXCommand(command);
    }
    
    if (group == 6){
        var str1 = document.getElementById('AnalogWarn1').value;
        var str2 = document.getElementById('AnalogWarn2').value;
        var str3 = document.getElementById('AnalogWarn3').value;
        var str4 = document.getElementById('AnalogWarn4').value;
        
        if(isNaN(str1) == false && isNaN(str1) == false && isNaN(str1) == false && isNaN(str1) == false) {
            
        }
        
        else{
            alert("Invalid number!");
            return;
        }
        
        var command = 'anWarns.cgi?val1='+str1+'&val2='+str2+'&val3='+str3+'&val4='+str4;
        newAJAXCommand(command);
    }
}

function getAdmin(xmlData) {
    var str;
    
    
    for(var i=1; i<=3; i++){
        str = 'smsNumber' + i;
        str = getXMLValue(xmlData, str);
        document.getElementById('smsNumber' + i).value = str;
    }
    
    str = 'gmtOffset';
    str = getXMLValue(xmlData, str);
    if(!str.includes("-")) {
        var str = '+' + str;
    }
    document.getElementById('gmtOffset').value = str;
    
    str = 'ipAddr';
    str = getXMLValue(xmlData, str);
    document.getElementById('ip').value = str;
    
    str = 'subNet';
    str = getXMLValue(xmlData, str);
    document.getElementById('subNet').value = str;
    
    str = 'getaway';
    str = getXMLValue(xmlData, str);
    document.getElementById('getaway').value = str;
    
    str = 'dns1';
    str = getXMLValue(xmlData, str);
    document.getElementById('dns1').value = str;
    
    str = 'dns2';
    str = getXMLValue(xmlData, str);
    document.getElementById('dns2').value = str;
    
    str = 'dhcp';
    str = getXMLValue(xmlData, str);
    
    if(str == 'on'){
        document.getElementById('dhcpEnabled').checked = true;
    }
    else {
        document.getElementById('dhcpEnabled').checked = false;
    }
    
    ipFieldsConfig();
}

function ipFieldsConfig() {
    if(document.getElementById('dhcpEnabled').checked == true){
        document.getElementById('ip').disabled= true;
        document.getElementById('subNet').disabled= true;
        document.getElementById('getaway').disabled= true;
        document.getElementById('dns1').disabled= true;
        document.getElementById('dns2').disabled= true;
    }
    else{
        document.getElementById('ip').disabled= false;
        document.getElementById('subNet').disabled= false;
        document.getElementById('getaway').disabled= false;
        document.getElementById('dns1').disabled= false;
        document.getElementById('dns2').disabled= false;

    }
}

function setAdmin(group) {
    if (group == 1){
        var str1 = document.getElementById('login').value;
        var str2 = document.getElementById('password').value;
        var str3 = document.getElementById('npassword').value;
        var str4 = document.getElementById('rpassword').value;
        
        if(str3 != str4){
            alert("Passwords does not match!");
            return;
        }
        
        var command = 'pass.cgi?pas='+str1+'&log='+str2+'&npas='+str3+'&rpas='+str4;
        newAJAXCommand(command);
    }
    
    if (group == 2){
        var str1 = document.getElementById('smsNumber1').value;
        var str2 = document.getElementById('smsNumber2').value;
        var str3 = document.getElementById('smsNumber3').value;
        
        if((str1.length != 13 && str1.length != 0) || (str2.length != 13 && str2.length != 0) || (str3.length != 13 && str3.length != 0)) {
            alert("Wrong number format!");
            return;
        }
        
        if(((str1.includes("+") == 0) && (str1.length != 0))|| ((str2.includes("+") == 0) && (str2.length != 0)) || ((str3.includes("+") == 0) && (str3.length != 0))) {
            alert("Wrong number format!");
            return;
        }
        
        if( isNaN(str1) || isNaN(str2) || isNaN(str3)){
            alert("Wrong number format!");
            return;
        }
        
        
        var command = 'sms.cgi?num1='+str1+'&num2='+str2+'&num3='+str3;
        newAJAXCommand(command);
    }
    
    if (group == 3){
        var str1 = document.getElementById('ip').value;
        var str2 = document.getElementById('subNet').value;
        var str3 = document.getElementById('getaway').value;
        var str4 = document.getElementById('dns1').value;
        var str5 = document.getElementById('dns2').value;
        
        if(document.getElementById('dhcpEnabled').checked == true){
            var str6 = "1";
        }
        else {
            var str6 = "0";
            var ipformat = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
            
            if(!str1.match(ipformat)){
                alert("Wrong IP address!");
                return;
            }
            
            if(!str2.match(ipformat)){
                alert("Wrong subnet mask address!");
                return;
            }
            
            if(!str3.match(ipformat)){
                alert("Wrong getaway address!");
                return;
            }
            
            if(!str4.match(ipformat)){
                alert("Wrong DNS1 address!");
                return;
            }
            
            if(!str5.match(ipformat)){
                alert("Wrong DNS2 address!");
                return;
            }
        }
        
        var data = 'dhcp='+str6+'&ip='+str1+'&gw='+str3+'&sub='+str2+'&dns1='+str4+'&dns2='+str5;
        
        newAJAXCommand('network.cgi', forwardFunc() ,false, data);
    }
    
    if (group == 4){
        var str1 = document.getElementById('gmtOffset').value;
        
        if( isNaN(str1) ){
            alert("Wrong number format!");
            return;
        }

        
        var command = 'log.cgi?par=' + str1;
        newAJAXCommand(command);
    }
    
    if (group == 5){
        var command = 'log.cgi?par=cl';
        newAJAXCommand(command);
    }
}

function forwardFunc(){
    window.location.href = "/protect/reboot.htm?";
}

function showSuccess(xmlData) {
    str = getXMLValue(xmlData, 'successFlag');
    if(str == '0') {
        for(var i=1; i<=10; i++){
            document.getElementById('group'+i).style.backgroundColor = '#dedede';
        }
    }
    if(str == '1') {
        document.getElementById('group1').style.backgroundColor = '#ccffcc';
    }
    if(str == '2') {
        document.getElementById('group2').style.backgroundColor = '#ccffcc';
    }
    if(str == '3') {
        document.getElementById('group3').style.backgroundColor = '#ccffcc';
    }
    if(str == '4') {
        document.getElementById('group4').style.backgroundColor = '#ccffcc';
    }
    if(str == '5') {
        document.getElementById('group5').style.backgroundColor = '#ccffcc';
    }
    if(str == '6') {
        document.getElementById('group6').style.backgroundColor = '#ccffcc';
    }
    if(str == '7') {
        document.getElementById('group7').style.backgroundColor = '#ccffcc';
    }
    if(str == '8') {
        document.getElementById('group8').style.backgroundColor = '#ccffcc';
    }
    if(str == '9') {
        document.getElementById('group9').style.backgroundColor = '#ccffcc';
    }
    if(str == '10') {
        document.getElementById('group10').style.backgroundColor = '#ccffcc';
    }
}

function openTab(evt, tabName) {
    // Declare all variables
    var i, tabcontent, tablinks;
    
    // Get all elements with class="tabcontent" and hide them
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    
    // Get all elements with class="tablinks" and remove the class "active"
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    
    // Show the current tab, and add an "active" class to the button that opened the tab
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
}


// Kick off the AJAX Updater
setTimeout("pollAJAX()", 500);

newAJAXCommand('/status.xml', updateView, true);
newAJAXCommand('/status.xml', setLabels, true);
newAJAXCommand('/status.xml', getSensors, false);
newAJAXCommand('/status.xml', getAdmin, false);
newAJAXCommand('/status.xml', showSuccess, true);
