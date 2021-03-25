// NOTE: this needs to match your Ganache localhost (for local testing)
// NOTE: for Ropsten testing, "Web3.givenProvider" should match Ropsten network on MetaMask
let web3 = new Web3(Web3.givenProvider || "ws://localhost:7545");
//let web3 = new Web3(Web3.givenProvider);

async function startApp() {
  console.log(ethereum);

  const accounts = await ethereum.request({
    method: 'eth_accounts'
  });
  try {
    //FIX THIS LATER (doesn't work because getBlockNumber() was an experimental method that got removed?)
    let blockNumber = await ethereum.getBlockNumber();
    console.log('current block number : ', blockNumber)
  } catch (e) {
    console.log(e.message)
  }

  // Should probably restart app when provider changes!
  const provider = await detectEthereumProvider();
  if (provider) {
    console.log("Provider: ", provider);
    // From now on, this should always be true:
    // provider === window.ethereum
    //startApp(provider); // initialize your app
  } else {
    console.log('Install MetaMask!');
  }


  /**********************************************************/
  /* Handle chain (network) and chainChanged (per EIP-1193) */
  /**********************************************************/

  const chainId = await ethereum.request({
    method: 'eth_chainId'
  });
  handleChainChanged(chainId);

  ethereum.on('chainChanged', handleChainChanged);

  function handleChainChanged(_chainId) {
    // We recommend reloading the page, unless you must do otherwise
    console.log(_chainId);
    //window.location.reload();
  }

  /***********************************************************/
  /* Handle user accounts and accountsChanged (per EIP-1193) */
  /***********************************************************/

  let currentAccount = null;
  ethereum
    .request({
      method: 'eth_accounts'
    })
    .then(handleAccountsChanged)
    .catch((err) => {
      // Some unexpected error.
      // For backwards compatibility reasons, if no accounts are available,
      // eth_accounts will return an empty array.
      console.error(err);
    });

  // Note that this event is emitted on page load.
  // If the array of accounts is non-empty, you're already
  // connected.
  ethereum.on('accountsChanged', handleAccountsChanged);

  // For now, 'eth_accounts' will continue to always return an array
  function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
      // MetaMask is locked or the user has not connected any accounts
      console.log('Please connect to MetaMask.');
    } else if (accounts[0] !== currentAccount) {
      currentAccount = accounts[0];
      ACTIVE_WALLET = currentAccount;
      // Do any other work!
      $('#currentWallet').html("Current Active Wallet: " + ACTIVE_WALLET);
    }
  }

  /*********************************************/
  /* Access the user's accounts (per EIP-1102) */
  /*********************************************/
  function updateActiveContract() {
    // Eth Contract takes the ABI
    ACTIVE_CONTRACT = new web3.eth.Contract(NLTK_ERC20_CONFIG.ContractABI, NLTK_ERC20_CONFIG.ContractAddress);

    console.log("ACTIVE_CONTRACT updated");
  }

  async function getCurrentBalance() {
    var currentBalance = await ACTIVE_CONTRACT.methods.balanceOf(ACTIVE_WALLET).send({
      from: ACTIVE_WALLET
    });

    console.log("Current Balance: " + currentBalance);
    return currentBalance;
  }

  // You should only attempt to request the user's accounts in response to user
  // interaction, such as a button click.
  // Otherwise, you popup-spam the user like it's 1999.
  // If you fail to retrieve the user's account(s), you should encourage the user
  // to initiate the attempt.
  document.getElementById('connectWallet').onclick = connect;

  // While you are awaiting the call to eth_requestAccounts, you should disable
  // any buttons the user can click to initiate the request.
  // MetaMask will reject any additional requests while the first is still
  // pending.
  function connect() {
    ethereum
      .request({
        method: 'eth_requestAccounts'
      })
      .then(handleAccountsChanged)
      .catch((err) => {
        if (err.code === 4001) {
          // EIP-1193 userRejectedRequest error
          // If this happens, the user rejected the connection request.
          console.log('Please connect to MetaMask.');
        } else {
          console.error(err);
        }
      });
  }


  document.getElementById('send').onclick = send;

  async function send() {
    var walletAddressOfRecipient = document.getElementById('recipientAddress').value;
    var amountToSend = document.getElementById('amount').value * 100;

    console.log("Address of recipient: " + walletAddressOfRecipient);
    console.log("Amount to send:" + amountToSend);

    updateActiveContract();

    var newTransactionBlock = await ACTIVE_CONTRACT.methods.transfer(walletAddressOfRecipient, amountToSend).send({
      from: ACTIVE_WALLET
    });

    console.log(newTransactionBlock);
  }


  document.getElementById('interactionTest').onclick = gamble;

  async function gamble() {
    updateActiveContract();

    //var result = "Old Balance: " + getCurrentBalance() + " | ";
    var result = "";

    console.log("ACTIVE_WALLET: " + ACTIVE_WALLET);
    console.log("ACTIVE_CONTRACT: " + ACTIVE_CONTRACT);

    var newTransactionBlock = await ACTIVE_CONTRACT.methods.yolo().send({
      from: ACTIVE_WALLET
    }).catch((err) => {
      result += "Error: " + err;
    });
    console.log(newTransactionBlock);

    var decision = newTransactionBlock.events.Decision.returnValues[0];
    console.log("Decision: " + decision);

    if(decision % 2 == 0) {
      result += "You won " + newTransactionBlock.events.Transfer.returnValues[2]/100 + " Nil Token!";
    }
    else {
      result += "You lost " + newTransactionBlock.events.Transfer.returnValues[2]/100 + " Nil Token :'(";
    }

    $('#testDiv').html(result);
  }
}

startApp();

// https://docs.metamask.io/guide/ethereum-provider.html#methods
