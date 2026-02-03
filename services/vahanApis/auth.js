const axios = require('axios');
const qs = require('qs'); // For form-urlencoded payload

// Define the API endpoint and credentials
// const ENVIRONMENT = 'PROD'; // Change to 'PROD' for production
const endpoint = process.env.VAHANURL + '/oauth/token' ;
const apiKey = process.env.VAHANAPIKEY;
const secretKey = process.env.VAHANSECRETKEY;

// Create the Basic Auth header value
const authHeader = Buffer.from(`${apiKey}:${secretKey}`).toString("base64");
console.log("Auth header: " + authHeader);
// Define the request payload
const payload = qs.stringify({
  grant_type: 'client_credentials',
});

// Make the POST request
// (async () => {
//   try {
//     const response = await axios.post(endpoint, payload, {
//       headers: {
//         Authorization: `Basic ${authHeader}`,
//         'Content-Type': 'application/x-www-form-urlencoded',
//       },
//     });

//     console.log('Token Response:', response.data);
//   } catch (error) {
//     console.error('Error:', error.response ? error.response.data : error.message);
//   }
// })();

async function getAuthToken(){
  try {
    const response = await axios.post(endpoint, payload, {
      headers: {
        Authorization: `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
 
    console.log('Token Response:', response.data);
    return response.data
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

module.exports = {
  getAuthToken
}