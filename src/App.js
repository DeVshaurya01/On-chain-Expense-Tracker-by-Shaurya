import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';  // Library for interacting with Ethereum blockchain
import './App.css';
import ExpenseTrackerABI from './ExpenseTrackerABI.json';  // This contains information about how to talk to our smart contract
import GetUsernameByAddress from "./GetUsernameByAddress";
function App() {
  // --- VARIABLES STORED IN THE COMPONENT (STATE) ---
  // These variables can change and when they do, the page will update
  const [provider, setProvider] = useState(null);  // Connection to the Ethereum network
  const [contract, setContract] = useState(null);  // Our expense tracker smart contract
  const [account, setAccount] = useState('');  // User's Ethereum wallet address
  const [isConnected, setIsConnected] = useState(false);  // Whether user connected their wallet
  const [isRegistered, setIsRegistered] = useState(false);  // Whether user registered their name
  const [name, setName] = useState('');  // User's name
  const [expenses, setExpenses] = useState([]);  // List of all expenses
  const [people, setPeople] = useState([]);  // List of all registered people
  const [loadingExpenses, setLoadingExpenses] = useState(false);  // Whether expenses are being loaded
  const [expenseLabel, setExpenseLabel] = useState('');  // Description for a new expense
  const [participants, setParticipants] = useState([{ address: '', amountPaid: 0, amountOwed: 0 }]);  // People involved in a new expense
  const [totalUsers, setTotalUsers] = useState(0);  // State to store total registered users
  const [showAddExpense, setShowAddExpense] = useState(false);  // Whether to show the "Add Expense" form
  const contractAddress = "0x21d7ee29536589F9A322B9e9572cf863fb3232e5"; // Paste the address recieved from Remix IDE here
  const [wallet, setWallet] = useState("");

  // --- RUNS WHEN THE PAGE FIRST LOADS ---
  // This connects to the user's Ethereum wallet (like MetaMask)
  useEffect(() => {
    const init = async () => {
      // Check if MetaMask (or similar wallet) is installed
      if (window.ethereum) {
        try {
          // Ask user permission to connect to their wallet
          await window.ethereum.request({ method: 'eth_requestAccounts' });
          // Create a connection to Ethereum
          const providerInstance = new ethers.providers.Web3Provider(window.ethereum);
          setProvider(providerInstance);

          // Check if user is on the right Ethereum network (Sepolia test network)
          const network = await providerInstance.getNetwork();
          if (network.chainId !== 11155111) {  // 11155111 is the ID for Sepolia testnet
            alert("Please connect to Sepolia testnet.");
            return;
          }

          // Get user's account and save it
          const signer = providerInstance.getSigner();
          const address = await signer.getAddress();
          setAccount(address);
          setIsConnected(true);

          // Connect to our expense tracker smart contract
          const contractInstance = new ethers.Contract(contractAddress, ExpenseTrackerABI, signer);
          setContract(contractInstance);

          // Listen for user changing their account in MetaMask
          window.ethereum.on('accountsChanged', (accounts) => {
            setAccount(accounts[0] || '');
            setIsConnected(accounts.length > 0);
          });

        } catch (error) {
          console.error("Initialization error:", error);
        }
      } else {
        // If MetaMask is not installed
        alert("Please install MetaMask.");
      }
    };

    init();  // Run the initialization function

    // Clean up when component unmounts (good practice to prevent memory leaks)
    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
      }
    };
  }, []);  // Empty array means this runs only once when page loads
  // --- FETCH TOTAL REGISTERED USERS ---
  const fetchTotalUsers = async () => {
    if (!contract) return;
    try {
      const count = await contract.getTotalRegisteredUsers(); // Call the smart contract method
      setTotalUsers(Number(count));
    } catch (error) {
      console.error("Error fetching total users:", error);
    }
  };
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000); // Update every second

    return () => clearInterval(interval); // Cleanup on component unmount
  }, []);


  // --- RUNS WHEN CONTRACT OR ACCOUNT CHANGES ---
  // Checks if user is registered and loads their data
  useEffect(() => {
    const checkRegistration = async () => {
      if (!contract || !account) return;  // Skip if contract or account isn't ready

      try {
        // Ask the contract if this user is registered
        const person = await contract.getPerson(account);
        const registered = person.walletAddress !== ethers.constants.AddressZero;
        setIsRegistered(registered);

        if (registered) {
          setName(person.name);  // Save the user's name
          await loadExpenses();  // Load all expenses
          await loadPeople();  // Load all registered people
        }
      } catch (error) {
        console.error("Error checking registration:", error);
      }
    };
    checkRegistration();
  }, [contract, account]);  // Run this when contract or account changes

  // --- DEBUGGING HELP ---
  // Prints expense information to console for troubleshooting
  useEffect(() => {
    if (expenses.length > 0) {
      console.log("LOADED EXPENSES:", expenses);
      console.log("LOADED PEOPLE:", people);

      // Print each expense's details to the console
      expenses.forEach(expense => {
        console.log(`Expense: ${expense.label}`);
        expense.participants.forEach(p => {
          console.log(`  Participant: ${p.address.substring(0, 8)}...`);
          console.log(`    Paid: ${p.amountPaid} ETH, Owes: ${p.amountOwed} ETH`);
          console.log(`    Net: ${parseFloat(p.amountPaid) - parseFloat(p.amountOwed)} ETH`);
        });
      });
    }
  }, [expenses, people]);  // Run when expenses or people change

  // --- REGISTER NEW USER ---
  // Saves user's name to the blockchain
  const registerPerson = async () => {
    if (!name.trim()) {  // Check if name is empty
      alert("Please enter your name.");
      return;
    }
    try {
      // Call the registerPerson function in our smart contract
      const tx = await contract.registerPerson(name.trim());
      await tx.wait();  // Wait for transaction to be confirmed on blockchain
      setIsRegistered(true);
      alert("Registration successful!");
      await loadPeople();  // Refresh list of people
      await loadExpenses();  // Refresh list of expenses
    } catch (error) {
      console.error("Registration failed:", error);
      alert(`Registration failed: ${error.message}`);
    }
  };
  const [newName, setNewName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);


  // --- LOAD ALL EXPENSES ---
  // Gets all expenses from the blockchain
  const loadExpenses = async () => {
    if (!contract || !isRegistered) return;  // Skip if not ready
    setLoadingExpenses(true);  // Show loading indicator
    try {
      // Get the total number of expenses
      const count = await contract.expenseCount();
      const loaded = [];

      // Loop through each expense and load its details
      for (let i = 0; i < count; i++) {
        try {
          // Get basic expense info
          const [id, label, timestamp] = await contract.getExpenseBasicInfo(i);
          // Get list of addresses involved in this expense
          const participantsAddresses = await contract.getExpenseParticipants(i);

          // For each participant, get how much they paid and owe
          const participantsData = await Promise.all(
            participantsAddresses.map(async (address) => {
              try {
                const amountPaid = await contract.getAmountPaid(i, address);
                const amountOwed = await contract.getAmountOwed(i, address);
                return {
                  address,
                  amountPaid: ethers.utils.formatEther(amountPaid),  // Convert from wei to ETH
                  amountOwed: ethers.utils.formatEther(amountOwed),  // Convert from wei to ETH
                };
              } catch (error) {
                console.error(`Error loading amounts for participant ${address}:`, error);
                return { address, amountPaid: "0", amountOwed: "0" };
              }
            })
          );

          // Add this expense to our list
          loaded.push({
            id: id.toNumber(),  // Convert from BigNumber to regular number
            label,
            timestamp: new Date(timestamp.toNumber() * 1000).toLocaleString(),  // Convert timestamp to readable date
            participants: participantsData,
          });
        } catch (error) {
          console.error(`Error loading expense ${i}:`, error);
        }
      }

      setExpenses(loaded);  // Save all expenses to state
    } catch (error) {
      console.error("Error loading expenses:", error);
      alert("Could not load expenses. Check console.");
    } finally {
      setLoadingExpenses(false);  // Hide loading indicator
    }
  };

  // --- LOAD ALL REGISTERED PEOPLE ---
  // Gets list of all registered users
  const loadPeople = async () => {
    if (!contract) return;  // Skip if contract isn't ready
    try {
      // Get all registered addresses
      const addresses = await contract.getAllRegisteredPeople();
      // For each address, get their name and balance
      const peopleData = await Promise.all(
        addresses.map(async (address) => {
          const person = await contract.getPerson(address);
          const netBalance = await contract.getNetBalance(address);
          return {
            address,
            name: person.name,
            netBalance: ethers.utils.formatEther(netBalance),  // Convert from wei to ETH
          };
        })
      );
      setPeople(peopleData);  // Save people to state
    } catch (error) {
      console.error("Error loading people:", error);
    }
  };

  const logout = () => {
    setAccount(''); // Clear the user's account
    setIsConnected(false); // Set the connection status to false
    setIsRegistered(false); // Set the registration status to false
    setName(''); // Clear the user's name
    setExpenses([]); // Clear the expenses
    setPeople([]); // Clear the list of registered people
    setTotalUsers(0); // Reset the total users count
    setShowAddExpense(false); // Hide the "Add Expense" form
    console.log("User logged out");
  };

  // --- ADD NEW EXPENSE ---
  // Creates a new expense on the blockchain
  const addExpense = async () => {
    // Input validation
    if (!expenseLabel.trim()) {
      alert("Enter an expense label.");
      return;
    }
    if (participants.length === 0) {
      alert("Add at least one participant.");
      return;
    }

    for (const participant of participants) {
      if (!participant.address || participant.amountPaid < 0 || participant.amountOwed < 0) {
        alert("Participant details are invalid.");
        return;
      }
    }

    try {
      // Prepare data for the smart contract
      const addresses = participants.map(p => p.address.trim());
      const paidAmounts = participants.map(p => ethers.utils.parseEther(p.amountPaid.toString()));  // Convert ETH to wei
      const owedAmounts = participants.map(p => ethers.utils.parseEther(p.amountOwed.toString()));  // Convert ETH to wei

      // Call the addExpense function in our smart contract
      const tx = await contract.addExpense(expenseLabel, addresses, paidAmounts, owedAmounts);
      await tx.wait();  // Wait for transaction to be confirmed

      // Reset form and reload data
      setExpenseLabel('');
      setParticipants([{ address: '', amountPaid: 0, amountOwed: 0 }]);
      setShowAddExpense(false);
      await loadExpenses();
      await loadPeople();
    } catch (error) {
      console.error("Error adding expense:", error);
      alert(`Error: ${error.message}`);
    }
  };

  // --- HELPER FUNCTIONS FOR PARTICIPANTS ---
  // Add a new participant row to the form
  const addParticipant = () => {
    setParticipants([...participants, { address: '', amountPaid: 0, amountOwed: 0 }]);
  };

  // Update a participant's information
  const updateParticipant = (index, field, value) => {
    const updated = [...participants];
    updated[index][field] = value;
    setParticipants(updated);
  };

  // Remove a participant from the form
  const removeParticipant = (index) => {
    if (participants.length > 1) {
      setParticipants(participants.filter((_, i) => i !== index));
    }
  };
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [darkMode, setDarkMode] = useState(true);
  // --- UPDATE USER NAME ---
  // Changes the user's name on the blockchain
  const updateName = async () => {
    if (!newName.trim()) {
      alert("Please enter a name.");
      return;
    }

    try {
      // Call the updatePersonName function in our smart contract
      const tx = await contract.updatePersonName(newName.trim());
      await tx.wait();  // Wait for transaction to be confirmed

      // Update the name in local state
      setName(newName.trim());
      setNewName('');
      setIsEditingName(false);
      alert("Name updated successfully!");
    } catch (error) {
      console.error("Name update failed:", error);
      alert(`Name update failed: ${error.message}`);
    }
  };


  // --- THE PAGE LAYOUT (USER INTERFACE) ---
  return (
    <div className="App">
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px',
        borderRadius: '12px',
        color: 'white',
        textAlign: 'center',
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)'
      }}>
        <h1>⛓️ On-Chain Expense Tracker⛓️</h1>
        <p>Track expenses with transparency. Built on Ethereum.</p>
      </div>

      <header className="App-header">

        {/* STEP 1: CONNECT WALLET - Show if not connected */}
        {!isConnected ? (
          <button onClick={() => window.ethereum.request({ method: 'eth_requestAccounts' })}>
            Connect Wallet
          </button>

        )

          /* STEP 2: REGISTER - Show if connected but not registered */
          : !isRegistered ? (
            <div>
              <h2>Register</h2>
              <input
                type="text"
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <button onClick={registerPerson}>Register</button>
              <p>🕒 Current Time: {currentTime}</p>
              <p>📬 Wallet Address: {account}</p>
              <p>🌐 Network: Sepolia Testnet</p>


            </div>
          )

            /* STEP 3: MAIN APP - Show if connected and registered */
            : (
              <div>
                <h2>Welcome, {name}</h2>
                <p>Account: {account}</p>
                <p>Total Registered Users: {people.length}</p>
                <button onClick={() => setShowAddExpense(!showAddExpense)}>
                  {showAddExpense ? "Cancel" : "Add Expense"}
                </button>
                <button onClick={loadExpenses}>Refresh Expenses</button>
                <button onClick={loadPeople}>Refresh People</button>
                
                <button onClick={() => setIsEditingName(!isEditingName)} style={{ marginLeft: '10px', fontSize: '0.8em' }}>
                  {isEditingName ? "Cancel" : "Edit Name"}
                </button>
                {isEditingName && (
                  <div style={{ margin: '10px 0' }}>
                    <input
                      type="text"
                      placeholder="New Name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                    <button onClick={updateName}>Update Name</button>
                  </div>
                )}


                {/* ADD EXPENSE FORM - Show when "Add Expense" is clicked */}
                {showAddExpense && (
                  <div>
                    <h3>New Expense</h3>
                    <input
                      type="text"
                      placeholder="Expense Label"
                      value={expenseLabel}
                      onChange={(e) => setExpenseLabel(e.target.value)}
                    />
                    {/* For each participant, show input fields */}
                    {participants.map((p, idx) => (
                      <div key={idx}>
                        <input
                          placeholder="Address"
                          value={p.address}
                          onChange={(e) => updateParticipant(idx, 'address', e.target.value)}
                        />
                        <input
                          type="number"
                          placeholder="Paid"
                          value={p.amountPaid}
                          onChange={(e) => updateParticipant(idx, 'amountPaid', e.target.value)}
                        />
                        <input
                          type="number"
                          placeholder="Owed"
                          value={p.amountOwed}
                          onChange={(e) => updateParticipant(idx, 'amountOwed', e.target.value)}
                        />
                        <button onClick={() => removeParticipant(idx)}>Remove</button>
                      </div>
                    ))}
                    <button onClick={addParticipant}>Add Participant</button>
                    <button onClick={addExpense}>Save Expense</button>
                  </div>
                )}
                <button
                  onClick={async () => {
                    try {
                      const name = await contract.getMyName();
                      alert(`Your registered name is: ${name}`);
                    } catch (err) {
                      alert("Error: " + err.message);
                    }
                  }}
                >
                  Get My Name
                </button>
                {/* PEOPLE LIST - Show all registered users */}
                <h3>People</h3>
                <table style={{ borderCollapse: 'collapse', margin: '10px 0' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '8px', border: '1px solid #ddd' }}>Name</th>
                      <th style={{ padding: '8px', border: '1px solid #ddd' }}>Address</th>
                      <th style={{ padding: '8px', border: '1px solid #ddd' }}>Net Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {people.map((person, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{person.name}</td>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{person.address.substring(0, 8)}...</td>
                        <td style={{ padding: '8px', border: '1px solid #ddd', color: parseFloat(person.netBalance) < 0 ? 'red' : 'green' }}>
                          {parseFloat(person.netBalance).toFixed(5)} ETH
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* EXPENSE HISTORY - Show all expenses */}
                <h3>Expense History</h3>
                {loadingExpenses ? <p>Loading...</p> : (
                  expenses.map(expense => (
                    <div key={expense.id} style={{ border: '1px solid #ddd', margin: '10px 0', padding: '10px' }}>
                      <h4>{expense.label}</h4>
                      <p>{expense.timestamp}</p>
                      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                        <thead>
                          <tr>
                            <th style={{ padding: '5px', border: '1px solid #ddd' }}>Participant</th>
                            <th style={{ padding: '5px', border: '1px solid #ddd' }}>Paid</th>
                            <th style={{ padding: '5px', border: '1px solid #ddd' }}>Owes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expense.participants.map((p, idx) => (
                            <tr key={idx}>
                              <td style={{ padding: '5px', border: '1px solid #ddd' }}>
                                {/* Show name if found, otherwise show shortened address */}
                                {people.find(person => person.address === p.address)?.name || p.address.substring(0, 8)}...
                              </td>
                              <td style={{ padding: '5px', border: '1px solid #ddd' }}>{p.amountPaid} ETH</td>
                              <td style={{ padding: '5px', border: '1px solid #ddd' }}>{p.amountOwed} ETH</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))
                )}

              </div>
            )}
      </header>
    </div>
  );
}

export default App;