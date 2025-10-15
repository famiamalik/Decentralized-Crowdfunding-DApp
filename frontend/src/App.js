import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Rocket, Users, TrendingUp, Wallet, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

import { KYC_CONTRACT_ADDRESS, CROWDFUNDING_CONTRACT_ADDRESS, KYC_ABI, CROWDFUNDING_ABI } from './config';

const CONFIG = {
  KYC_CONTRACT_ADDRESS,
  CROWDFUNDING_CONTRACT_ADDRESS,
  KYC_ABI,
  CROWDFUNDING_ABI
};

function App() {
  const [account, setAccount] = useState('');
  const [balance, setBalance] = useState('0');
  const [provider, setProvider] = useState(null);
  const [kycContract, setKycContract] = useState(null);
  const [crowdfundingContract, setCrowdfundingContract] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [campaigns, setCampaigns] = useState([]);
  const [kycRequests, setKycRequests] = useState([]);
  const [kycForm, setKycForm] = useState({ name: '', cnic: '' });
  const [campaignForm, setCampaignForm] = useState({ title: '', description: '', goal: '' });
  const [contributeAmount, setContributeAmount] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    checkMetaMask();
  }, []);

  useEffect(() => {
    if (kycContract && crowdfundingContract && account) {
      initializeApp();
    }
  }, [kycContract, crowdfundingContract, account]);

  const checkMetaMask = async () => {
    if (typeof window.ethereum === 'undefined') {
      setError('Please install MetaMask to use this DApp!');
      return;
    }
    connectWallet();
  };

  const connectWallet = async () => {
    try {
      setLoading(true);
      setError('');
      
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await browserProvider.send("eth_requestAccounts", []);
      const userSigner = await browserProvider.getSigner();
      const userBalance = await browserProvider.getBalance(accounts[0]);
      
      setProvider(browserProvider);
      setAccount(accounts[0]);
      setBalance(ethers.formatEther(userBalance));
      
      const kyc = new ethers.Contract(CONFIG.KYC_CONTRACT_ADDRESS, CONFIG.KYC_ABI, userSigner);
      const crowdfunding = new ethers.Contract(CONFIG.CROWDFUNDING_CONTRACT_ADDRESS, CONFIG.CROWDFUNDING_ABI, userSigner);
      
      setKycContract(kyc);
      setCrowdfundingContract(crowdfunding);
      
      setSuccess('Wallet connected successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error connecting wallet:', err);
      setError('Failed to connect wallet: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const initializeApp = async () => {
    await checkAdminStatus();
    await checkVerificationStatus();
    await loadCampaigns();
  };

  const checkAdminStatus = async () => {
    try {
      const adminAddress = await kycContract.admin();
      setIsAdmin(adminAddress.toLowerCase() === account.toLowerCase());
    } catch (err) {
      console.error('Error checking admin status:', err);
    }
  };

  const checkVerificationStatus = async () => {
    try {
      const verified = await kycContract.checkVerified(account);
      setIsVerified(verified);
    } catch (err) {
      console.error('Error checking verification:', err);
    }
  };

  const loadCampaigns = async () => {
    try {
      const allCampaigns = await crowdfundingContract.getAllCampaigns();
      setCampaigns(allCampaigns);
    } catch (err) {
      console.error('Error loading campaigns:', err);
    }
  };

  const loadKYCRequests = async () => {
    try {
      const requests = await kycContract.getAllRequests();
      const requestsData = await Promise.all(
        requests.map(async (addr) => {
          const status = await kycContract.getKYCStatus(addr);
          return { 
            address: addr, 
            name: status[0],
            cnic: status[1],
            isApproved: status[2],
            isRejected: status[3],
            exists: status[4]
          };
        })
      );
      setKycRequests(requestsData);
    } catch (err) {
      console.error('Error loading KYC requests:', err);
    }
  };

  useEffect(() => {
    if (isAdmin && kycContract && activeTab === 'admin') {
      loadKYCRequests();
    }
  }, [isAdmin, kycContract, activeTab]);

  const handleSubmitKYC = async () => {
    if (!kycForm.name || !kycForm.cnic) {
      setError('Please fill in all fields');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const tx = await kycContract.submitKYC(kycForm.name, kycForm.cnic);
      setSuccess('Submitting KYC request...');
      await tx.wait();
      setSuccess('KYC submitted successfully! Waiting for admin approval.');
      setKycForm({ name: '', cnic: '' });
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Error submitting KYC:', err);
      setError('Failed to submit KYC: ' + (err.reason || err.message));
    } finally {
      setLoading(false);
    }
  };

  const approveKYC = async (address) => {
    setLoading(true);
    setError('');
    
    try {
      const tx = await kycContract.approveKYC(address);
      setSuccess('Approving KYC...');
      await tx.wait();
      setSuccess('KYC approved successfully!');
      await loadKYCRequests();
      await checkVerificationStatus();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error approving KYC:', err);
      setError('Failed to approve KYC: ' + (err.reason || err.message));
    } finally {
      setLoading(false);
    }
  };

  const rejectKYC = async (address) => {
    setLoading(true);
    setError('');
    
    try {
      const tx = await kycContract.rejectKYC(address);
      setSuccess('Rejecting KYC...');
      await tx.wait();
      setSuccess('KYC rejected!');
      await loadKYCRequests();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error rejecting KYC:', err);
      setError('Failed to reject KYC: ' + (err.reason || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!campaignForm.title || !campaignForm.description || !campaignForm.goal) {
      setError('Please fill in all fields');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const goalInWei = ethers.parseEther(campaignForm.goal);
      const tx = await crowdfundingContract.createCampaign(
        campaignForm.title,
        campaignForm.description,
        goalInWei
      );
      setSuccess('Creating campaign...');
      await tx.wait();
      setSuccess('Campaign created successfully!');
      setCampaignForm({ title: '', description: '', goal: '' });
      await loadCampaigns();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error creating campaign:', err);
      setError('Failed to create campaign: ' + (err.reason || err.message));
    } finally {
      setLoading(false);
    }
  };

  const contribute = async (campaignId, amount) => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const amountInWei = ethers.parseEther(amount);
      const tx = await crowdfundingContract.contribute(campaignId, { value: amountInWei });
      setSuccess('Processing contribution...');
      await tx.wait();
      setSuccess('Contribution successful!');
      await loadCampaigns();
      setContributeAmount({ ...contributeAmount, [campaignId.toString()]: '' });
      
      const newBalance = await provider.getBalance(account);
      setBalance(ethers.formatEther(newBalance));
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error contributing:', err);
      setError('Failed to contribute: ' + (err.reason || err.message));
    } finally {
      setLoading(false);
    }
  };

  const withdrawFunds = async (campaignId) => {
    setLoading(true);
    setError('');
    
    try {
      const tx = await crowdfundingContract.withdrawFunds(campaignId);
      setSuccess('Withdrawing funds...');
      await tx.wait();
      setSuccess('Funds withdrawn successfully!');
      await loadCampaigns();
      
      const newBalance = await provider.getBalance(account);
      setBalance(ethers.formatEther(newBalance));
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error withdrawing funds:', err);
      setError('Failed to withdraw funds: ' + (err.reason || err.message));
    } finally {
      setLoading(false);
    }
  };

  const getCampaignStatus = (status) => {
    const statusMap = ['Active', 'Completed', 'Withdrawn'];
    return statusMap[status] || 'Unknown';
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #fce4ec 0%, #f8bbd0 50%, #f48fb1 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {error && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: '#f44336',
          color: 'white',
          padding: '1rem 1.5rem',
          borderRadius: '10px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          maxWidth: '400px'
        }}>
          <AlertCircle size={20} />
          <span style={{ flex: 1 }}>{error}</span>
          <button onClick={() => setError('')} style={{
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontSize: '1.2rem',
            padding: '0 0.5rem'
          }}>×</button>
        </div>
      )}
      
      {success && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: '#4caf50',
          color: 'white',
          padding: '1rem 1.5rem',
          borderRadius: '10px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          maxWidth: '400px'
        }}>
          <CheckCircle size={20} />
          <span>{success}</span>
        </div>
      )}

      <header style={{
        background: 'white',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        padding: '1rem 2rem'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Rocket color="#ec407a" size={32} />
            <div>
              <h1 style={{
                fontSize: '1.8rem',
                fontWeight: 'bold',
                background: 'linear-gradient(to right, #ec407a, #f06292)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                margin: 0
              }}>CrowdFund DApp</h1>
              <p style={{ fontSize: '0.75rem', color: '#666', margin: 0 }}>
                Developed by Famia Malik, Roll No: BSCS-021
              </p>
            </div>
          </div>
          
          <nav style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            {['home', 'campaigns', 'kyc'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  color: activeTab === tab ? '#ec407a' : '#666'
                }}
              >
                {tab.toUpperCase()}
              </button>
            ))}
            {isAdmin && (
              <button
                onClick={() => setActiveTab('admin')}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  color: activeTab === 'admin' ? '#ec407a' : '#666'
                }}
              >
                ADMIN
              </button>
            )}
          </nav>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Wallet color="#ec407a" size={20} />
            <div>
              <p style={{ fontSize: '0.9rem', fontWeight: '600', color: '#333', margin: 0 }}>
                {parseFloat(balance).toFixed(4)} ETH
              </p>
              <p style={{ fontSize: '0.75rem', color: '#666', margin: 0 }}>
                {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Not Connected'}
              </p>
            </div>
          </div>
        </div>
      </header>

      {activeTab === 'home' && (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '4rem 2rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '3rem',
            alignItems: 'center'
          }}>
            <div>
              <h2 style={{
                fontSize: '3.5rem',
                fontWeight: 'bold',
                color: '#333',
                marginBottom: '1.5rem',
                lineHeight: '1.2'
              }}>
                Ready to
                <span style={{
                  display: 'block',
                  background: 'linear-gradient(to right, #ec407a, #f06292)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  Reach Your Goals?
                </span>
              </h2>
              <p style={{ color: '#666', marginBottom: '2rem', lineHeight: '1.6' }}>
                Launch your dream project and get funded by the community. Our decentralized platform ensures transparency and trust.
              </p>
              <button
                onClick={() => setActiveTab('campaigns')}
                style={{
                  background: 'linear-gradient(to right, #ec407a, #f06292)',
                  color: 'white',
                  border: 'none',
                  padding: '1rem 2rem',
                  borderRadius: '50px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                START EXPLORING
              </button>
              {isVerified && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: '#4caf50',
                  fontSize: '0.9rem',
                  marginLeft: '1rem'
                }}>
                  <CheckCircle size={16} />
                  Verified User
                </span>
              )}
            </div>
            
            <div style={{
              background: 'linear-gradient(135deg, #ec407a, #f06292)',
              borderRadius: '30px',
              padding: '2rem',
              color: 'white'
            }}>
              <h3 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                Blockchain-Powered
              </h3>
              <p style={{ marginBottom: '1.5rem', opacity: 0.9, lineHeight: '1.6' }}>
                Smart contract-based platform for transparent, secure fundraising.
              </p>
              <div style={{ fontSize: '0.9rem' }}>
                <p style={{ marginBottom: '0.5rem' }}>✓ Secure Ethereum transactions</p>
                <p style={{ marginBottom: '0.5rem' }}>✓ KYC verification system</p>
                <p>✓ Transparent fund management</p>
              </div>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem',
            marginTop: '3rem'
          }}>
            {[
              { Icon: Users, title: 'KYC Verification', text: 'Verified users create campaigns with admin approval.' },
              { Icon: TrendingUp, title: 'Smart Campaigns', text: 'Create and manage fundraising with automatic tracking.' },
              { Icon: Wallet, title: 'Secure Withdrawals', text: 'Campaign creators withdraw funds when goals are reached.' }
            ].map((item, i) => (
              <div key={i} style={{
                background: 'white',
                borderRadius: '20px',
                padding: '1.5rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                <item.Icon color="#ec407a" size={32} />
                <h4 style={{ fontWeight: 'bold', color: '#333', margin: '1rem 0 0.5rem' }}>
                  {item.title}
                </h4>
                <p style={{ fontSize: '0.9rem', color: '#666', lineHeight: '1.5' }}>
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'campaigns' && (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '3rem 2rem' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#333', marginBottom: '2rem' }}>
            Active Campaigns
          </h2>
          
          {(isVerified || isAdmin) && (
            <div style={{
              background: 'white',
              borderRadius: '20px',
              padding: '2rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              marginBottom: '2rem'
            }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#333', marginBottom: '1.5rem' }}>
                Create New Campaign
              </h3>
              <input
                type="text"
                placeholder="Campaign Title"
                value={campaignForm.title}
                onChange={(e) => setCampaignForm({ ...campaignForm, title: e.target.value })}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: '1px solid #ddd',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  marginBottom: '1rem',
                  boxSizing: 'border-box'
                }}
              />
              <textarea
                placeholder="Campaign Description"
                value={campaignForm.description}
                onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: '1px solid #ddd',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  marginBottom: '1rem',
                  minHeight: '120px',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
              <input
                type="number"
                step="0.001"
                placeholder="Funding Goal (ETH)"
                value={campaignForm.goal}
                onChange={(e) => setCampaignForm({ ...campaignForm, goal: e.target.value })}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: '1px solid #ddd',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  marginBottom: '1rem',
                  boxSizing: 'border-box'
                }}
              />
              <button
                onClick={handleCreateCampaign}
                disabled={loading}
                style={{
                  background: 'linear-gradient(to right, #ec407a, #f06292)',
                  color: 'white',
                  border: 'none',
                  padding: '1rem 2rem',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1
                }}
              >
                {loading ? 'Creating...' : 'Create Campaign'}
              </button>
            </div>
          )}
          
          {campaigns.length === 0 ? (
            <div style={{
              background: 'white',
              borderRadius: '20px',
              padding: '3rem',
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
              <Clock size={64} color="#ccc" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ color: '#666', marginBottom: '0.5rem' }}>No campaigns yet</h3>
              <p style={{ color: '#999' }}>Be the first to create a campaign!</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '1.5rem'
            }}>
              {campaigns.map((campaign) => {
                const progress = campaign.goal > 0 ? (Number(campaign.fundsRaised) / Number(campaign.goal)) * 100 : 0;
                const isCreator = campaign.creator.toLowerCase() === account.toLowerCase();
                
                return (
                  <div key={campaign.id.toString()} style={{
                    background: 'white',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}>
                    <div style={{
                      background: 'linear-gradient(135deg, #ec407a, #f06292)',
                      height: '120px'
                    }}></div>
                    <div style={{ padding: '1.5rem' }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1rem'
                      }}>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '50px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          background: campaign.status === 0 ? '#e8f5e9' : campaign.status === 1 ? '#e3f2fd' : '#f5f5f5',
                          color: campaign.status === 0 ? '#2e7d32' : campaign.status === 1 ? '#1565c0' : '#616161'
                        }}>
                          {getCampaignStatus(campaign.status)}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#999' }}>
                          ID: {campaign.id.toString()}
                        </span>
                      </div>
                      
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#333', marginBottom: '0.5rem' }}>
                        {campaign.title}
                      </h3>
                      <p style={{
                        fontSize: '0.9rem',
                        color: '#666',
                        marginBottom: '1rem',
                        minHeight: '3rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {campaign.description}
                      </p>
                      
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.85rem',
                          marginBottom: '0.5rem'
                        }}>
                          <span style={{ color: '#666' }}>Progress</span>
                          <span style={{ fontWeight: '600', color: '#333' }}>
                            {progress.toFixed(1)}%
                          </span>
                        </div>
                        <div style={{
                          width: '100%',
                          height: '8px',
                          background: '#f0f0f0',
                          borderRadius: '10px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            height: '100%',
                            background: 'linear-gradient(to right, #ec407a, #f06292)',
                            width: `${Math.min(progress, 100)}%`,
                            transition: 'width 0.3s'
                          }}></div>
                        </div>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.85rem',
                          marginTop: '0.5rem',
                          color: '#666'
                        }}>
                          <span>{ethers.formatEther(campaign.fundsRaised)} ETH</span>
                          <span>Goal: {ethers.formatEther(campaign.goal)} ETH</span>
                        </div>
                      </div>
                      
                      {campaign.status === 0 && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input
                            type="number"
                            step="0.001"
                            placeholder="Amount (ETH)"
                            value={contributeAmount[campaign.id.toString()] || ''}
                            onChange={(e) => setContributeAmount({
                              ...contributeAmount,
                              [campaign.id.toString()]: e.target.value
                            })}
                            style={{
                              flex: 1,
                              padding: '0.5rem',
                              border: '1px solid #ddd',
                              borderRadius: '8px',
                              fontSize: '0.9rem'
                            }}
                          />
                          <button
                            onClick={() => contribute(campaign.id, contributeAmount[campaign.id.toString()] || '0')}
                            disabled={loading}
                            style={{
                              background: '#ec407a',
                              color: 'white',
                              border: 'none',
                              padding: '0.5rem 1rem',
                              borderRadius: '8px',
                              fontSize: '0.9rem',
                              fontWeight: '600',
                              cursor: loading ? 'not-allowed' : 'pointer',
                              opacity: loading ? 0.6 : 1
                            }}
                          >
                            Contribute
                          </button>
                        </div>
                      )}
                      
                      {isCreator && campaign.status === 1 && (
                        <button
                          onClick={() => withdrawFunds(campaign.id)}
                          disabled={loading}
                          style={{
                            width: '100%',
                            background: '#4caf50',
                            color: 'white',
                            border: 'none',
                            padding: '0.75rem',
                            borderRadius: '8px',
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.6 : 1
                          }}
                        >
                          Withdraw Funds
                        </button>
                      )}
                      
                      <p style={{ fontSize: '0.75rem', color: '#999', marginTop: '1rem' }}>
                        Creator: {campaign.creator.slice(0, 6)}...{campaign.creator.slice(-4)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'kyc' && (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem 2rem' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#333', marginBottom: '2rem' }}>
            KYC Verification
          </h2>
          
          {!isVerified ? (
            <div style={{
              background: 'white',
              borderRadius: '20px',
              padding: '2rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#333', marginBottom: '1.5rem' }}>
                Submit KYC Request
              </h3>
              <input
                type="text"
                placeholder="Full Name (e.g., Famia Malik)"
                value={kycForm.name}
                onChange={(e) => setKycForm({ ...kycForm, name: e.target.value })}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: '1px solid #ddd',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  marginBottom: '1rem',
                  boxSizing: 'border-box'
                }}
              />
              <input
                type="text"
                placeholder="CNIC (e.g., 12345-1234567-1)"
                value={kycForm.cnic}
                onChange={(e) => setKycForm({ ...kycForm, cnic: e.target.value })}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: '1px solid #ddd',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  marginBottom: '1rem',
                  boxSizing: 'border-box'
                }}
              />
              <button
                onClick={handleSubmitKYC}
                disabled={loading}
                style={{
                  background: 'linear-gradient(to right, #ec407a, #f06292)',
                  color: 'white',
                  border: 'none',
                  padding: '1rem 2rem',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1
                }}
              >
                {loading ? 'Submitting...' : 'Submit KYC'}
              </button>
            </div>
          ) : (
            <div style={{
              background: 'linear-gradient(135deg, #66bb6a, #4caf50)',
              borderRadius: '20px',
              padding: '3rem 2rem',
              color: 'white',
              textAlign: 'center'
            }}>
              <CheckCircle size={64} style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                KYC Verified!
              </h3>
              <p>Your account has been verified. You can now create campaigns.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'admin' && isAdmin && (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '3rem 2rem' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#333', marginBottom: '2rem' }}>
            KYC Requests Management
          </h2>
          
          {kycRequests.length === 0 ? (
            <div style={{
              background: 'white',
              borderRadius: '20px',
              padding: '3rem',
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
              <Clock size={64} color="#ccc" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ color: '#666', marginBottom: '0.5rem' }}>No KYC requests</h3>
              <p style={{ color: '#999' }}>Pending requests will appear here</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {kycRequests.map((request, index) => (
                <div
                  key={index}
                  style={{
                    background: 'white',
                    borderRadius: '15px',
                    padding: '1.5rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}
                >
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#333', marginBottom: '0.5rem' }}>
                      {request.name}
                    </h3>
                    <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.25rem' }}>
                      CNIC: {request.cnic}
                    </p>
                    <p style={{ fontSize: '0.85rem', color: '#999' }}>
                      {request.address.slice(0, 10)}...{request.address.slice(-8)}
                    </p>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {request.isApproved ? (
                      <span style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        background: '#e8f5e9',
                        color: '#2e7d32',
                        fontSize: '0.9rem',
                        fontWeight: '600'
                      }}>
                        <CheckCircle size={16} />
                        Approved
                      </span>
                    ) : request.isRejected ? (
                      <span style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        background: '#ffebee',
                        color: '#c62828',
                        fontSize: '0.9rem',
                        fontWeight: '600'
                      }}>
                        <XCircle size={16} />
                        Rejected
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => approveKYC(request.address)}
                          disabled={loading}
                          style={{
                            background: '#4caf50',
                            color: 'white',
                            border: 'none',
                            padding: '0.5rem 1rem',
                            borderRadius: '8px',
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.6 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}
                        >
                          <CheckCircle size={16} />
                          Approve
                        </button>
                        <button
                          onClick={() => rejectKYC(request.address)}
                          disabled={loading}
                          style={{
                            background: '#f44336',
                            color: 'white',
                            border: 'none',
                            padding: '0.5rem 1rem',
                            borderRadius: '8px',
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.6 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}
                        >
                          <XCircle size={16} />
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <footer style={{
        background: 'white',
        padding: '2rem',
        marginTop: '4rem',
        textAlign: 'center',
        boxShadow: '0 -2px 8px rgba(0,0,0,0.1)'
      }}>
        <p style={{ color: '#666', fontSize: '0.9rem' }}>
          © 2024 CrowdFund DApp | Developed by Famia Malik | Blockchain Assignment 2
        </p>
      </footer>
    </div>
  );
}

export default App;