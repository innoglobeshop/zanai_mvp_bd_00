const bcrypt = require('bcryptjs');

const pinToHash = '123456'; // <<-- CHOOSE YOUR TEST PIN HERE

bcrypt.genSalt(12, (err, salt) => { // Using work factor 12 as per spec
    if (err) throw err;
    bcrypt.hash(pinToHash, salt, (err, hash) => {
        if (err) throw err;
        console.log(`Original PIN: ${pinToHash}`);
        console.log(`Hashed PIN: ${hash}`);
        console.log("\nCopy the 'Hashed PIN' value above and use it in MongoDB Atlas.");
    });
});