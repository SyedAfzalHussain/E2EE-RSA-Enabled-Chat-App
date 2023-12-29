let keyPair = ''; // Global variable to store the key pair
let publicCreatedKey = "";
let remotePublicKey = "";
// const roomName = prompt('Please enter your name');
let roomName = "";
const socketClient = io("http://localhost:3000");
function generateKeyPair() {
  return window.crypto.subtle
    .generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"]
    )
    .then((keyPair) => {
      console.log("Key pair generated:", keyPair);
      return keyPair;
    })
    .catch((error) => console.error("Key pair generation error:", error));
}

document.getElementById("joinRoomBtn").addEventListener("click", () => {
  roomName = prompt("Please enter room name");
  document.getElementById("joinRoomBtn").style.display = "none";
  socketClient.emit("public-key-exchange", {
    roomName,
    publicKey: localStorage.getItem("publicKey"),
  });
});

if (!localStorage.getItem("publicKey") && !localStorage.getItem("privateKey")) {
  generateKeyPair().then((kp) => {
    keyPair = kp;
    exportKey(kp.publicKey, "spki");
    exportKey(kp.privateKey, "pkcs8");
  });
}

function exportKey(key, format) {
  return window.crypto.subtle.exportKey(format, key).then((rawKeyData) => {
    const exportedKeyBase64 = btoa(
      String.fromCharCode(...new Uint8Array(rawKeyData))
    );
    if (localStorage.getItem("publicKey") == null) {
      if (format === "spki") {
        localStorage.setItem("publicKey", exportedKeyBase64);
      } else if (format === "pkcs8") {
        localStorage.setItem("privateKey", exportedKeyBase64);
      }
    }
  });
}

let enData = "";

async function decryptData(msg) { 
  const encryptedDataAsBase64 = msg; 
  const privateKeyInBase64 = localStorage.getItem("privateKey");

  // Convert the private key from base64 to an ArrayBuffer
  const privateKeyArrayBuffer = new Uint8Array(
    atob(privateKeyInBase64).split("").map((char) => char.charCodeAt(0))
  );

  // Import the private key
  window.crypto.subtle
    .importKey(
      "pkcs8",
      privateKeyArrayBuffer,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      true,
      ["decrypt"]
    )
    .then((privateKey) => {
      // Decode the base64-encoded encrypted data
      const encryptedDataArrayBuffer = new Uint8Array(
        atob(encryptedDataAsBase64)
          .split("")
          .map((char) => char.charCodeAt(0))
      );

      // Decrypt the data using the private key
      window.crypto.subtle
        .decrypt(
          {
            name: "RSA-OAEP",
          },
          privateKey,
          encryptedDataArrayBuffer
        )
        .then((decryptedData) => {
          // Decode the decrypted data as text
          const decryptedText = new TextDecoder().decode(decryptedData);
          console.log("Decrypted message:", decryptedText);
          // Handle the decrypted message as needed
          let div = document.createElement("div");
          div.className = "received message";
          div.id = "received"
          div.innerHTML = decryptedText;
          document.getElementById("chatContainer").appendChild(div);          

        })
        .catch((error) => console.error("Decryption error:", error));
    })
    .catch((error) => console.error("Key import error:", error));

}




socketClient.on("connect", () => {
  console.log("connected to server", socketClient.id);
});
socketClient.on("remote-public-key", (publicKey) => {
  if (publicKey.roomName != roomName) { }
  else if (publicKey.publicKey != localStorage.getItem("publicKey")) {
    remotePublicKey = publicKey.publicKey;
    console.log("remoteePublicKey is : " + remotePublicKey);
  }
});
socketClient.on("chat-message-server", (encryptedData) => {
  console.log("encryptedData from serverrr is : " + encryptedData);
  decryptData(encryptedData);
});

socketClient.on("typing", (msg) => {
  console.log("Received typing event:", msg);
  document.getElementById("typing").textContent = msg;
});


document.getElementById("sendMessageBtn").addEventListener("click", () => {
  if (document.getElementById("messageInput").value == "") return;
  const msg = document.getElementById("messageInput").value;

  if (remotePublicKey != "") {
    const dataToEncrypt = msg;
    console.log({ remotePublicKey });
    const publicKey = atob(remotePublicKey);
    const encryptedpublicKeyArrayBuffer = new Uint8Array(
      publicKey.split("").map((char) => char.charCodeAt(0))
    );
    window.crypto.subtle
      .importKey(
        "spki",
        encryptedpublicKeyArrayBuffer,
        {
          name: "RSA-OAEP",
          hash: "SHA-256",
        },
        true,
        ["encrypt"]
      )
      .then((key) => {
        window.crypto.subtle
          .encrypt(
            {
              name: "RSA-OAEP",
            },
            key,
            new TextEncoder().encode(dataToEncrypt)
          )
          .then((encryptedData) => {
            const encryptedDataAsBase64 = btoa(
              String.fromCharCode(...new Uint8Array(encryptedData))
            );
            socketClient.emit("chat-message", encryptedDataAsBase64, roomName);
            let div = document.createElement("div");
            div.className = "sent message";
            div.id = "sent";
            div.innerHTML = msg;
            document.getElementById("chatContainer").appendChild(div);
            document.getElementById("messageInput").value = ''

          })
          .catch((error) => console.error("Encryption error:", error));
      });
  } else {
    console.warn(
      "Remote public key not yet received. Message will be sent unencrypted."
    );
  }
});
