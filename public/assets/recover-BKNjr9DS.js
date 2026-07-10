import{f as t,b as c,l as y,v,j as u}from"./user-CHff2p5H.js";function m(){return`
    <main class="login-screen" aria-labelledby="recoveryTitle">
      <section class="login-card">
        <p class="login-kicker">Account recovery</p>
        <h1 id="recoveryTitle">Reset password</h1>
        <p class="login-subtitle">Verify your recovery key, then set a new password.</p>
        <div class="account-status login-status" id="recoveryStatus" role="status"></div>
        <div class="recovery-panel recovery-panel-visible">
          ${t({id:"recoverIdentity",label:"Username or email",placeholder:"Username or email",className:"compact-field"})}
          ${t({id:"recoverKey",label:"Recovery key",type:"password",placeholder:"Recovery key",className:"compact-field"})}
          ${t({id:"recoverNewPassword",label:"New password",type:"password",placeholder:"New password (min 8 chars)",className:"compact-field"})}
          <div class="login-actions">
            ${c({id:"recoverVerifyBtn",variant:"secondary",label:"Verify key"})}
            ${c({id:"recoverResetBtn",variant:"primary",label:"Reset password"})}
            ${y({className:"login-link-button",href:"/",label:"Back to login"})}
          </div>
        </div>
      </section>
    </main>
  `}document.querySelector("#root").innerHTML=m();const s=document.getElementById("recoveryStatus"),n=document.getElementById("recoverIdentity"),i=document.getElementById("recoverKey"),l=document.getElementById("recoverNewPassword"),a=document.getElementById("recoverVerifyBtn"),o=document.getElementById("recoverResetBtn");function r(e,d=!1){s&&(s.textContent=e||"",s.classList.toggle("auth-error",d))}a==null||a.addEventListener("click",async()=>{try{await v({username:n.value.trim(),recovery_key:i.value}),r("Recovery key verified. You can now reset your password.")}catch(e){r(`Recovery verification failed: ${e.message}`,!0)}});o==null||o.addEventListener("click",async()=>{try{const e=await u({username:n.value.trim(),recovery_key:i.value,new_password:l.value});r(`Password reset. Save your rotated recovery key: ${e.recovery_key}`),l.value=""}catch(e){r(`Password reset failed: ${e.message}`,!0)}});
