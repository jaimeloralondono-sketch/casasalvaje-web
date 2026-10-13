/* Grupo ONO forms (brief §8.1): native POST, success = /thanks.html */
(function(){
var f=document.querySelector("form[data-netlify]");if(!f)return;
var E=f.elements,cv=E.cv,b=f.querySelector("[type=submit]"),t=b.textContent,busy,first,
M={name:"Please enter your full name.",email:"Please enter an email address like name@example.com.",whatsapp:"Please enter a WhatsApp number, with country code.",message:"Please write your message.",consent:"Please tick this box to send.",adult:"You must be 18 or older to apply."};
function slot(e){return document.getElementById(e.name+"-err")}
function say(e,m){var o=slot(e);if(!o)return;o.textContent=m;if(m)e.setAttribute("aria-invalid","true");else e.removeAttribute("aria-invalid")}
// (a) CV: PDF by name or type, 5 MB at most.
function checkCV(){var x=cv.files&&cv.files[0],m="";if(x){if(!/\.pdf$/i.test(x.name)&&x.type!="application/pdf")m="Please upload your CV as a PDF.";else if(x.size>5<<20)m="The file is larger than 5 MB."}cv.setCustomValidity(m);return m}
// (b) Inline errors; focus the first bad field.
f.addEventListener("invalid",function(ev){var e=ev.target;if(!slot(e))return;ev.preventDefault();
say(e,e==cv?cv.validationMessage:M[e.name]||(e.tagName=="SELECT"?"Please choose an option.":e.validationMessage));
if(!first){first=e;e.focus();setTimeout(function(){first=0})}},true);
f.addEventListener("input",function(ev){var e=ev.target;say(e,e==cv?checkCV():"");go()});
// (c) One submit; freed on Back, an edit or an aborted POST.
function go(){busy=0;b.removeAttribute("aria-disabled");b.textContent=t}
f.addEventListener("submit",function(ev){if(busy){ev.preventDefault();return}busy=1;b.setAttribute("aria-disabled","true");b.textContent="Sending…";window.navigation||setTimeout(go,3e4)});
addEventListener("pageshow",go);window.navigation&&navigation.addEventListener("navigateerror",go);
// (d) ?reason= preselect.
var r=E.reason,q=new URLSearchParams(location.search).get("reason");
if(r&&q&&[].some.call(r.options,function(o){return o.value==q}))r.value=q;
})();
