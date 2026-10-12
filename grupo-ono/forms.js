/* Grupo ONO forms (brief §8.1). Posts natively to Netlify; success is the /thanks.html load. No fetch, no fake success. */
(function(){
var f=document.querySelector("form[data-netlify]");if(!f)return;
var E=f.elements,cv=E.cv,b=f.querySelector("[type=submit]"),t=b.textContent,busy,first,
M={name:"Please enter your full name.",email:"Please enter an email address like name@example.com.",whatsapp:"Please enter a WhatsApp number, with country code.",message:"Please write your message.",consent:"Please tick this box to send.",adult:"You must be 18 or older to apply."};
function slot(e){return document.getElementById(e.name+"-err")}
function say(e,m){var o=slot(e);if(!o)return;o.textContent=m;if(m)e.setAttribute("aria-invalid","true");else e.removeAttribute("aria-invalid")}
// (a) CV: a PDF (by name or type), 5 MB at most.
function checkCV(){var x=cv.files&&cv.files[0],m="";if(x){if(!/\.pdf$/i.test(x.name)&&x.type!="application/pdf")m="Please upload your CV as a PDF.";else if(x.size>5242880)m="The file is larger than 5 MB."}cv.setCustomValidity(m);return m}
// (b) Inline errors, not the browser bubble; focus the first invalid field.
f.addEventListener("invalid",function(ev){var e=ev.target;if(!slot(e))return;ev.preventDefault();
say(e,e==cv?cv.validationMessage:M[e.name]||(e.tagName=="SELECT"?"Please choose an option.":e.validationMessage));
if(!first){first=e;e.focus();setTimeout(function(){first=0})}},true);
f.addEventListener("input",function(ev){var e=ev.target;say(e,e==cv?checkCV():"")});
// (c) One submit only.
f.addEventListener("submit",function(ev){if(busy){ev.preventDefault();return}busy=1;b.setAttribute("aria-disabled","true");b.textContent="Sending…"});
addEventListener("pageshow",function(){busy=0;b.removeAttribute("aria-disabled");b.textContent=t});
// (d) ?reason= preselects the reason, only when it names an option.
var r=E.reason,q=new URLSearchParams(location.search).get("reason");
if(r&&q&&[].some.call(r.options,function(o){return o.value==q}))r.value=q;
})();
