import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './Login.css'

function App() {
  return (
   
    <div className='main'>
      <div className='login-container'>
       <h1> Please enter the correct information </h1>
       <div className="email-container">
       <p> Email</p>
         <input type="text" placeholder='email' className='email'/>
         </div>
            <div className="password-container">
         <p1>Password</p1>
        <input type="password" placeholder='password' className='password'/>
        </div>
        </div>
    </div>



  )
}

export default App
