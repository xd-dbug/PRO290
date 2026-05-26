import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './Register.css'

function App() {
  return (
   
     <div className='main'>
      <div className='register-container'>
       <h1> Please enter your name </h1>
         <input type="text" placeholder='name' className='name'/>
        <h1> Please enter your email and password </h1>
        <input type="email" placeholder='email' className='email'/>
        <input type="password" placeholder='password' className='password'/>
        </div>
    </div>



  )
}

export default App
