#### Features added in the d-app:
1)Enabled user to edit their registered name after registering themselves with their wallet i.e., on the main application which tracks expenses:
made following changes in the solidity code:

````
function updatePersonName(string memory _newName) public {
    // Ensure that the new name is not an empty string
    require(bytes(_newName).length > 0, "Name cannot be empty");

    // Check that the caller (msg.sender) is already registered
    // If their wallet address is not stored, they are not registered
    require(
        people[msg.sender].walletAddress != address(0),
        "Person is not registered"
    );

    // Update the name in the 'people' mapping
    people[msg.sender].name = _newName;

    // Emit an event to signal that the name was updated
    // This is useful for UI updates or logs on the blockchain
    emit PersonNameUpdated(msg.sender, _newName);
}
````


#### in the app .js:
````
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
````

#### in return block:
````
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
````
<img src="https://github.com/DeVshaurya01/On-chain-Expense-Tracker-by-Shaurya/blob/main/Screenshot%202025-04-20%20183534.png">
and the input box appears like this
<img src="https://github.com/DeVshaurya01/On-chain-Expense-Tracker-by-Shaurya/blob/main/Screenshot%202025-04-20%20183551.png">

#### 2)added a button called refresh people which refreshes the users registered after changing the name

#### 3)made changes in the css file, made the ui a little more appealing by adding gradient on the upper side

#### 4)added the feature to see the current wallet address of the person from the js file
````
<p>Account: {account}</p>
````
#### 5)added the feature to see the total no of registered users using the js file 
  instead of creating a contract in solidity for counting up the registered people i used the length of people array to determine the no of registered users
  ```` <p>Total Registered Users: {people.length}</p>````
#### 6)added a feature to see the current time from the starting window


#### trials:
tried to get the username of the person from his wallet address registered on the platform by using solididty code and react. but the file ended up with lots of bugging and i couldnt figure out the code. 
thats why the get my name button on my d-app is invalid. 
created a jsx file and imported it into main app.js

