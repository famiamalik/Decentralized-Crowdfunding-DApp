// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract KYCRegistry_FamiaMalik {
    address public admin;
    
    struct KYCRequest {
        string name;
        string cnic;
        address userAddress;
        bool isApproved;
        bool isRejected;
        bool exists;
    }
    
    mapping(address => KYCRequest) public kycRequests;
    address[] public allRequests;
    mapping(address => bool) public isVerified;
    
    event KYCSubmitted(address indexed user, string name, string cnic);
    event KYCApproved(address indexed user, string name);
    event KYCRejected(address indexed user, string name);
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }
    
    constructor() {
        admin = msg.sender;
    }
    
    function submitKYC(string memory _name, string memory _cnic) public {
        require(!kycRequests[msg.sender].exists, "KYC already submitted");
        require(bytes(_name).length > 0, "Name cannot be empty");
        require(bytes(_cnic).length > 0, "CNIC cannot be empty");
        
        kycRequests[msg.sender] = KYCRequest({
            name: _name,
            cnic: _cnic,
            userAddress: msg.sender,
            isApproved: false,
            isRejected: false,
            exists: true
        });
        
        allRequests.push(msg.sender);
        
        emit KYCSubmitted(msg.sender, _name, _cnic);
    }
    
    function approveKYC(address _user) public onlyAdmin {
        require(kycRequests[_user].exists, "KYC request does not exist");
        require(!kycRequests[_user].isApproved, "KYC already approved");
        require(!kycRequests[_user].isRejected, "KYC was rejected");
        
        kycRequests[_user].isApproved = true;
        isVerified[_user] = true;
        
        emit KYCApproved(_user, kycRequests[_user].name);
    }
    
    function rejectKYC(address _user) public onlyAdmin {
        require(kycRequests[_user].exists, "KYC request does not exist");
        require(!kycRequests[_user].isApproved, "KYC already approved");
        
        kycRequests[_user].isRejected = true;
        isVerified[_user] = false;
        
        emit KYCRejected(_user, kycRequests[_user].name);
    }
    
    function getAllRequests() public view returns (address[] memory) {
        return allRequests;
    }
    
    function getKYCStatus(address _user) public view returns (
        string memory name,
        string memory cnic,
        bool isApproved,
        bool isRejected,
        bool exists
    ) {
        KYCRequest memory request = kycRequests[_user];
        return (
            request.name,
            request.cnic,
            request.isApproved,
            request.isRejected,
            request.exists
        );
    }
    
    function checkVerified(address _user) public view returns (bool) {
        return isVerified[_user];
    }
}