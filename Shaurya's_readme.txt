Features added in the d-app:
1)Enabled user to edit their registered name after registering themselves with their wallet i.e., on the main application which tracks expenses:
made following changes in the solidity code:

// Event to notify front-end apps or external listeners that a user's name was updated
event PersonNameUpdated(address indexed walletAddress, string newName);

/**
 * @dev Updates the name of a registered user in the contract
 * @param _newName The new name to be assigned to the user
 */
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

2)added a button called refresh people which refreshes the users registered after changing the name

3)made changes in the css file, made the ui a little more appealing by adding gradient on the upper side

4)added the feature to see the current wallet address of the person from the js file
<p>Account: {account}</p>


extras:
5)added the feature to see the total no of registered users using the js file 
  instead of creating a contract in solidity for counting up the registered people i used the length of people array to determine the no of registered users
   <p>Total Registered Users: {people.length}</p>
6)added a feature to see the current time from the starting window


trials:
tried to get the username of the person from his wallet address registered on the platform by using solididty code and react. but the file ended up with lots of bugging and i couldnt figure out the code. 
thats why the get my name button on my d-app is invalid. 
created a jsx file and imported it into main app.js


