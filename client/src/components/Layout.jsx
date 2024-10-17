import React from 'react'
import  Header  from './Header'
import Footer from './Footer'

const Layout = ({children}) => {
  return (
    <div className='flex flex-col min-h-screen scrollable'>
    <Header/>
    <main className='grow mt-20'>
    {children}
    </main>
    <Footer />
    </div>
  )
}

export default Layout