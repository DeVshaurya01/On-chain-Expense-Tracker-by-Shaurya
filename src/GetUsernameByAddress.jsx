import { useState } from "react";
import { ethers } from "ethers";
import ExpenseTrackerABI from "./ExpenseTrackerABI.json"; 
const contractAddress = "0x21d7ee29536589F9A322B9e9572cf863fb3232e5"; 

function GetUsernameByAddress() {
  const [inputAddress, setInputAddress] = useState("");
  const [userName, setUserName] = useState("");

  const getUsername = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const contract = new ethers.Contract(contractAddress, ExpenseTrackerABI, provider);

    try {
      const name = await contract.getNameByAddress(inputAddress);
      if (name) {
        setUserName(name);
      } else {
        setUserName("No user found for this address.");
      }
    } catch (error) {
      console.error("Error fetching name:", error);
      setUserName("Error fetching name.");
    }
  };

  return (
    <div>
      <input
        type="text"
        placeholder="Enter wallet address"
        value={inputAddress}
        onChange={(e) => setInputAddress(e.target.value)}
      />
      <button onClick={getUsername}>Get Name</button>
      {userName && <p>Username: {userName}</p>}
    </div>
  );
}

export default GetUsernameByAddress;
