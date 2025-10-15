// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IKYCRegistry {
    function checkVerified(address _user) external view returns (bool);
    function admin() external view returns (address);
}

contract Crowdfunding_FamiaMalik {
    IKYCRegistry public kycRegistry;
    
    enum CampaignStatus { Active, Completed, Withdrawn }
    
    struct Campaign {
        uint256 id;
        string title;
        string description;
        uint256 goal;
        uint256 fundsRaised;
        address payable creator;
        CampaignStatus status;
        bool exists;
    }
    
    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => uint256)) public contributions;
    uint256 public campaignCount;
    
    event CampaignCreated(
        uint256 indexed campaignId,
        string title,
        address indexed creator,
        uint256 goal
    );
    
    event ContributionMade(
        uint256 indexed campaignId,
        address indexed contributor,
        uint256 amount
    );
    
    event FundsWithdrawn(
        uint256 indexed campaignId,
        address indexed creator,
        uint256 amount
    );
    
    modifier onlyVerifiedOrAdmin() {
        require(
            kycRegistry.checkVerified(msg.sender) || msg.sender == kycRegistry.admin(),
            "Only verified users or admin can create campaigns"
        );
        _;
    }
    
    modifier onlyCreator(uint256 _campaignId) {
        require(
            campaigns[_campaignId].creator == msg.sender,
            "Only campaign creator can withdraw"
        );
        _;
    }
    
    constructor(address _kycRegistryAddress) {
        kycRegistry = IKYCRegistry(_kycRegistryAddress);
    }
    
    function createCampaign(
        string memory _title,
        string memory _description,
        uint256 _goal
    ) public onlyVerifiedOrAdmin {
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_description).length > 0, "Description cannot be empty");
        require(_goal > 0, "Goal must be greater than 0");
        
        campaignCount++;
        
        campaigns[campaignCount] = Campaign({
            id: campaignCount,
            title: _title,
            description: _description,
            goal: _goal,
            fundsRaised: 0,
            creator: payable(msg.sender),
            status: CampaignStatus.Active,
            exists: true
        });
        
        emit CampaignCreated(campaignCount, _title, msg.sender, _goal);
    }
    
    function contribute(uint256 _campaignId) public payable {
        Campaign storage campaign = campaigns[_campaignId];
        
        require(campaign.exists, "Campaign does not exist");
        require(campaign.status == CampaignStatus.Active, "Campaign is not active");
        require(msg.value > 0, "Contribution must be greater than 0");
        
        campaign.fundsRaised += msg.value;
        contributions[_campaignId][msg.sender] += msg.value;
        
        if (campaign.fundsRaised >= campaign.goal) {
            campaign.status = CampaignStatus.Completed;
        }
        
        emit ContributionMade(_campaignId, msg.sender, msg.value);
    }
    
    function withdrawFunds(uint256 _campaignId) public onlyCreator(_campaignId) {
        Campaign storage campaign = campaigns[_campaignId];
        
        require(campaign.exists, "Campaign does not exist");
        require(
            campaign.status == CampaignStatus.Completed,
            "Campaign must be completed to withdraw"
        );
        require(campaign.fundsRaised > 0, "No funds to withdraw");
        
        uint256 amount = campaign.fundsRaised;
        campaign.status = CampaignStatus.Withdrawn;
        campaign.fundsRaised = 0;
        
        campaign.creator.transfer(amount);
        
        emit FundsWithdrawn(_campaignId, msg.sender, amount);
    }
    
    function getCampaign(uint256 _campaignId) public view returns (
        uint256 id,
        string memory title,
        string memory description,
        uint256 goal,
        uint256 fundsRaised,
        address creator,
        CampaignStatus status
    ) {
        Campaign memory campaign = campaigns[_campaignId];
        return (
            campaign.id,
            campaign.title,
            campaign.description,
            campaign.goal,
            campaign.fundsRaised,
            campaign.creator,
            campaign.status
        );
    }
    
    function getAllCampaigns() public view returns (Campaign[] memory) {
        Campaign[] memory allCampaigns = new Campaign[](campaignCount);
        
        for (uint256 i = 1; i <= campaignCount; i++) {
            allCampaigns[i - 1] = campaigns[i];
        }
        
        return allCampaigns;
    }
    
    function getContribution(uint256 _campaignId, address _contributor) 
        public 
        view 
        returns (uint256) 
    {
        return contributions[_campaignId][_contributor];
    }
}

