// Assuming this code is within a component that renders the footer.  Adjust accordingly if in a different location.
// Example:  A Footer.js component or a layout component that includes the footer.

import React from 'react';

function Footer() {
  return (
    <footer>
      <p>Powered by <a href="https://runthebusiness.substack.com" target="_blank" rel="noopener noreferrer">Run The Business</a></p>
    </footer>
  );
}

export default Footer;

//Example usage within a layout component:
// import Footer from './Footer';
// function Layout({ children }) {
//   return (
//     <div>
//       {children}
//       <Footer />
//     </div>
//   );
// }
// export default Layout;