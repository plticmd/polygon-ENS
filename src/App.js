// import React from 'react';
import React, { useEffect, useState } from "react";
import "./styles/App.css";
import twitterLogo from "./assets/twitter-logo.svg"
import {ethers} from "ethers";
import contractAbi from "./utils/contractABI.json";
import polygonLogo from './assets/polygonlogo.png';
import ethLogo from './assets/ethlogo.png';
import { networks } from './utils/networks';

// Constants
const TWITTER_HANDLE = 'LNomado';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const tld = ".Apt";
//"YOUR_CONTRACT_ADDRESS_HERE"
const CONTRACT_ADDRESS = "0x57BD9C3BE3e28d8084B7e462e69a611be117837E";

const App = () => {
  //ユーザーのウォレットアドレスをstate管理しています。冒頭のuseStateのインポートを忘れないでください。
  const [currentAccount, setCurrentAccount] = useState("");
  // state管理するプロパティを追加しています。
  const [domain, setDomain] = useState("");
  const [record, setRecord] = useState("");
  // network を状態変数として設定します。
  const [network, setNetwork] = useState("");
  // 新しい状態変数を定義しています。これまでのものの下に追加しましょう。
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  // 状態を管理する mints を定義します。初期状態は空の配列です。
  const [mints, setMints] = useState([]);

  // connectWallet 関数を定義
  const connectWallet = async () => {
	try {
		const { ethereum } = window;

		if (!ethereum) {
			alert("Get Metamask -> https://metamask.io/");
			return;
		}

		// アカウントへのアクセスを要求するメソッドを使用します。
		const accounts = await ethereum.request({
			method: "eth_requestAccounts"
		});

		// Metamask を一度認証すれば Connected とコンソールに表示されます。
		console.log("Connected", accounts[0]);
		setCurrentAccount(accounts[0]);
	} catch (error) {
	  console.log(error);
	}
  };

  const switchNetwork = async () => {
	if (window.ethereum) {
		try {
			// Mumbai testnet に切り替えます。
			await window.ethereum.request({
				method: 'wallet_switchEthereumChain',
				params: [{ chainId: '0x13881' }],// utilsフォルダ内のnetworks.js を確認しましょう。0xは16進数です。
			});
		} catch (error) {
			// このエラーコードは当該チェーンがメタマスクに追加されていない場合です。
      		// その場合、ユーザーに追加するよう促します。
			if (error.code === 4902) {
				try {
					await window.ethereum.request({
						method: 'wallet_addEthereumChain',
						params: [
							{
								chainId: '0x13881',
								chainName: 'Polygon Mumbai Testnet',
								rpcUrls: ['https://rpc-mumbai.maticvigil.com/'],
								nativeCurrency: {
									name: "Mumbai Matic",
									symbol: "MATIC",
									decimals: 18
								},
								blockExplorerUrls: ["https://mumbai.polygonscan.com/"]
							},
						],
					});
				} catch (error) {
					console.log(error);
				}
			}
			console.log(error);
		}
	} else {
		// window.ethereum が見つからない場合メタマスクのインストールを促します。
		alert('Metamask is not installed. Please install it to use this app: https://metamask.io/download.html');
	}
  };


  // ウォレットの接続を確認します。
  //const checkIfWalletIsConnected = () => {
  const checkIfWalletIsConnected = async () => {
	 // window.ethereumの設定。この表記法はJavascriptの「分割代入」を参照。
	 const {ethereum} = window;

	 if (!ethereum) {
		console.log("Make sure you have Metamask!");
		return;
	 } else {
		console.log("You have the ethereum object", ethereum);
	 }

	 // ユーザーのウォレットをリクエストします。
	 const accounts = await ethereum.request({ method: "eth_accounts" });

	 // ユーザーが複数のアカウントを持っている場合もあります。ここでは最初のアドレスを使います。
	 if (accounts.length !==0) {
		const account = accounts[0];
		console.log("Found an authorized account:", account);
		setCurrentAccount(account);
	 } else {
		console.log("No authorized account found");
	 }

	 // ユーザーのネットワークのチェーンIDをチェックします。
	const chainId = await ethereum.request({ method: 'eth_chainId' });
	setNetwork(networks[chainId]);

	ethereum.on('chainChanged', handleChainChanged);

	// ネットワークが変わったらリロードします。
	function handleChainChanged(_chainId) {
		window.location.reload();
	}
  };

const mintDomain = async () => {
	// ドメインがnullのときrunしません。
	if (!domain) {return}
	// ドメインが3文字に満たない、短すぎる場合にアラートを出します。
	if (domain.length < 3) {
		alert('Domain must be at least 3 characters long');
		return;
	}
	// ドメインの文字数に応じて価格を計算します。
  	// 3 chars = 0.05 MATIC, 4 chars = 0.03 MATIC, 5 or more = 0.01 MATIC
	const price = 
		// domain.length === 3 ? "0.05" : domain.length === 4 ? "0.03" : "0.01";
		domain.length === 3 ? '0.005' : domain.length === 4 ? '0.003' : '0.001';
	console.log("Minting domain", domain, "with price", price);
	try {
		const {ethereum} = window;
		if (ethereum) {
			const provider = new ethers.providers.Web3Provider(ethereum);
			const signer = provider.getSigner();
			const contract = new ethers.Contract(
				CONTRACT_ADDRESS,
				contractAbi.abi,
				signer
			);

			console.log("Going to pop wallet now to pay gas...");
			  let tx = await contract.register(domain, {
				value: ethers.utils.parseEther(price)});
			// ミントされるまでトランザクションを待ちます。
			const receipt = await tx.wait();

			// トランザクションが問題なく実行されたか確認します。
			if (receipt.status === 1) {
				console.log(
					"Domain minted! https://mumbai.polygonscan.com/tx/" + tx.hash
				);

				// domainのrecordをセットします。
				tx = await contract.setRecord(domain, record);
				await tx.wait();

				console.log("Record set! https://mumbai.polygonscan.com/tx/" + tx.hash);

			   // fetchMints関数実行後2秒待ちます。
			   setTimeout(() => {
				fetchMints();
			   }, 2000);

				setRecord('');
				setDomain('');
			} else {
				alert("Transaction failed! Please try again");
			}
		}
	} catch (error) {
	  console.log(error);
	}
};


const fetchMints = async () => {
	try {
		const {ethereum} = window;
		if (ethereum) {
			const provider = new ethers.providers.Web3Provider(ethereum);
			const signer = provider.getSigner();
			const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi.abi, signer);

			// すべてのドメインを取得します。
			const names = await contract.getAllNames();

			// ネームごとにレコードを取得します。マッピングの対応を理解しましょう。
			const mintRecords = await Promise.all(names.map(async (name) => {
			const mintRecord = await contract.records(name);
			const owner = await contract.domains(name);
			return {
				id: names.indexOf(name),
				name: name,
				record: mintRecord,
				owner: owner,
			};
			}));

			console.log("MINTS FETCHED", mintRecords);
			setMints(mintRecords);
		}
	} catch(error) {
	  console.log(error);
	}
}



   const updateDomain = async () => {
	if (!record || !domain) { return }
	setLoading(true);
	console.log("Updating domain", domain, "with record", record);
		try {
			const { ethereum } = window;
			if (ethereum) {
				const provider = new ethers.providers.Web3Provider(ethereum);
				const signer = provider.getSigner();
				const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi.abi, signer);

				let tx = await contract.setRecord(domain, record);
				await tx.wait();
				console.log("Record set https://mumbai.polygonscan.com/tx/"+tx.hash);

				fetchMints();
				setRecord('');
				setDomain('');
			}
		} catch(error) {
		  console.log(error);
		}
	   setLoading(false);
    }

   // まだウォレットに接続されていない場合のレンダリングです。
   const renderNotConnectedContainer = () => (
	
	<div className = "connect-wallet-container">
		<img
	          src="https://media.giphy.com/media/3oGRFg4wLLEgwA0Rkk/giphy.gif"
              	  alt="Red bull gif"
		  //src = "https://media.giphy.com/media/yy6hXyy2DsM5W/giphy-downsized-large.gif"
		  //src = "https://media.giphy.com/media/1msxZUIsqN5pide6o5/giphy.gif" 
		  //src = "https://media.giphy.com/media/iDJQRjTCenF7A4BRyU/giphy.gif"
		  //src = "https://media.giphy.com/media/3ohhwytHcusSCXXOUg/giphy.gif"
		  
		/>
		{/* Connect Wallet ボタンが押されたときのみ connectWallet関数 を呼び出します。 */}
		{/* <button className = "cta-button connect-wallet-button"> */}
		
		<button 
			onClick={connectWallet}
			className = "cta-button connect-wallet-button"
		>
			
				Connect Wallet 
		</button>
	</div>
   );

   // ドメインネームとデータの入力フォームです。
   const renderInputForm = () => {
	
	//Polygon Mumbai Testnet上にいない場合、switchボタンをレンダリングします。
	if (network !== 'Polygon Mumbai Testnet') {
		return (
			<div className="connect-wallet-container">
				{/* <p>Please connect to the Polygon Mumbai Testnet</p> */}
				<p>Please switch Polygon Mumbai Testnet</p>
				{/* 今ボタンで switchNetwork 関数を呼び出します。 */}
				<button className='cta-button mint-button' onClick={switchNetwork}>Switch Mumbai</button>
			</div>
		);
	} //else {
	return (
		<div className="form-container">
			<div className="first-row">
				<input
				  type="text"
				  value={domain}
				  placeholder='domain'
				  onChange={(e) => setDomain(e.target.value)}
				/>
				<p className='tld'> {tld} </p>
			</div>

			<input
				type="text"
				value={record}
				placeholder='whats ur request?'
				onChange={(e) => setRecord(e.target.value)}
			/>
			{/* editing 変数が true の場合、"Set record" と "Cancel" ボタンを表示します。 */}
			{ editing ? (
				<div className="button-container">
					{/* updateDomain関数を呼び出します。 */}
					<button className='cta-button mint-button' disabled={loading} onClick={updateDomain}>
						Set record
					</button>
					 {/* editing を false にしてEditモードから抜けます。*/}
					 <button className='cta-button mint-button' onClick={() => {setEditing(false)}}>
						Cancel
					 </button>
				</div>
			) : (
				// editing 変数が true でない場合、Mint ボタンが代わりに表示されます。
				<button className='cta-button mint-button' disabled={loading} onClick={mintDomain}>
					Mint
				</button>
			)}
			{/* <div className="button-container"> */}
				{/* ボタンクリックで mintDomain関数 を呼び出します。 */}
				{/* <button
					className="cta-buton mint-button"
					//disabled={null}
					onClick={null}
				>
					Mint
				</button> */}
				{/* <button
					className="cta-button mint-button"
					disabled={null}
					onClick={null}
				>
					Set data
				</button> */}
			{/* </div> */}
		</div>
	);
   };
   //};

   const renderMints = () => {
	if (currentAccount && mints.length > 0) {
		return (
			<div className="mint-container">
				<p className="subtitle"> Recently minted domains!</p>
				<div className="mint-list">
					{mints.map((mint, index) => {
						return (
							<div className="mint-item" key={index}>
							  <div className='mint-row'>
								<a className="link" href={'https://testnets.opensea.io/assets/mumbai/${CONTRACT_ADDRESS}/${mint.id}'}target="_blank" rel="noopener noreferrer">
									<p className="underlined">{' '}{mint.name}{tld}{' '}</p>
								</a>
								 {/* mint.owner が currentAccount なら edit ボタンを追加します。 */}
								 {mint.owner.toLowerCase() === currentAccount.toLowerCase()?
								 <button className="edit-button" onClick={() => editRecord(mint.name)}>
									<img className="edit-icon" src="https://img.icons8.com/metro/26/000000/pencil.png" alt="Edit button" />
								 </button>
								:
								null 
							  }
							  </div>
							<p> {mint.record} </p>
						</div>)
					})}
				</div>
			</div>
		);
	}
   };

{!currentAccount && renderNotConnectedContainer()}
{currentAccount && renderInputForm()}
{mints && renderMints()}

   // edit モードを設定します。
   const editRecord = (name) => {
	console.log("Editing record for", name);
	setEditing(true);
	setDomain(name);
   }


   // ページがリロードされると呼び出されます。
   useEffect(() => {
	checkIfWalletIsConnected();
  
   // currentAccount, network が変わるたび実行されます。
   if (network === 'Polygon Mumbai Testnet') {
	fetchMints();
   }
   // },[]);
   },[currentAccount, network]);

   return (
		<div className="App">
			<div className="container">
				<div className="header-container">
					<header>
            			<div className="left">
             				 <p className="title">✈︎ Airport Name Service ✈︎</p>
             				 <p className="subtitle">Airport on the blockchain!</p>
            			</div>
						 {/* Display a logo and wallet connection status*/}
						 <div className="right">
							<img alt="Network logo" className="logo" src={ network.includes("Polygon") ? polygonLogo : ethLogo} />
							{ currentAccount ? <p> Wallet: {currentAccount.slice(0, 6)}...{currentAccount.slice(-4)} </p> : <p> Wallet disConnected </p> }
						 </div>
					</header>
				</div>

				{/* currentAccount が存在しない場合、Connect Wallet ボタンを表示します*/}
				{!currentAccount && renderNotConnectedContainer()}
				{/* アカウントが接続されるとインプットフォームをレンダリングします。 */}
				{currentAccount && renderInputForm()}
				{mints && renderMints()}

				{/* render 関数をここに追加します */}
				{/*{renderNotConnectedContainer()} */}

				

        		<div className="footer-container">
					<img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
					<a
						className="footer-text"
						href={TWITTER_LINK}
						target="_blank"
						rel="noreferrer"
					>
						{`build by @${TWITTER_HANDLE} via unchain`}
					</a>
				</div>
			</div>
		</div>
	);
};

export default App;
