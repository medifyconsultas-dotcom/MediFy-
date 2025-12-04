<script type="module">
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyDuyldD5kLNN0Dc2A1zvEN_NSywqmSq1ME",
    authDomain: "medify-7287d.firebaseapp.com",
    projectId: "medify-7287d",
    storageBucket: "medify-7287d.firebasestorage.app",
    messagingSenderId: "683047625591",
    appId: "1:683047625591:web:09eba8de4f83b56d703772",
    measurementId: "G-RJJ237XE5F"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
</script>