// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ChainOfHope {
    // ---------------- ORGAN SECTION ----------------
    struct Donor {
        uint id;
        string name;
        string bloodType;
        string organ;
        uint age;
        string reportUrl;
        bool registered;
        bool matched;
    }

    struct Recipient {
        uint id;
        string name;
        string bloodType;
        string organ;
        bool registered;
        bool matched;
    }

    struct Match {
        uint donorId;
        uint recipientId;
        uint timestamp;
    }

    uint public donorCount;
    uint public recipientCount;
    uint public matchCount;

    mapping(uint => Donor) public donors;
    mapping(uint => Recipient) public recipients;
    Match[] public matches;

    event DonorRegistered(uint donorId, string name, string bloodType, string organ, string reportUrl);
    event RecipientRegistered(uint recipientId, string name, string bloodType, string organ);
    event MatchFound(uint donorId, uint recipientId);

    // uniqueness checks (organ flow)
    function _isUniqueOrganDonor(string memory _name) internal view returns (bool) {
        for (uint i = 1; i <= donorCount; i++) {
            if (keccak256(bytes(donors[i].name)) == keccak256(bytes(_name))) {
                return false;
            }
        }
        return true;
    }
    function _isUniqueOrganRecipient(string memory _name) internal view returns (bool) {
        for (uint i = 1; i <= recipientCount; i++) {
            if (keccak256(bytes(recipients[i].name)) == keccak256(bytes(_name))) {
                return false;
            }
        }
        return true;
    }

    // Register organ donor (reportUrl required)
    function registerDonor(
        string memory _name,
        string memory _bloodType,
        string memory _organ,
        uint _age,
        string memory _reportUrl
    ) public {
        require(bytes(_reportUrl).length > 0, "Doctor report URL required");
        require(_isUniqueOrganDonor(_name), "Donor name already exists (organ flow)");
        donorCount++;
        donors[donorCount] = Donor(
            donorCount,
            _name,
            _bloodType,
            _organ,
            _age,
            _reportUrl,
            true,
            false
        );
        emit DonorRegistered(donorCount, _name, _bloodType, _organ, _reportUrl);
    }

    // Register organ recipient
    function registerRecipient(
        string memory _name,
        string memory _bloodType,
        string memory _organ
    ) public {
        require(_isUniqueOrganRecipient(_name), "Recipient name already exists (organ flow)");
        recipientCount++;
        recipients[recipientCount] = Recipient(recipientCount, _name, _bloodType, _organ, true, false);
        emit RecipientRegistered(recipientCount, _name, _bloodType, _organ);
    }

    // Compatibility logic for transfusion (ABO + Rh)
    function isBloodCompatible(string memory donor, string memory recipient) public pure returns (bool) {
        // exact match
        if (keccak256(bytes(donor)) == keccak256(bytes(recipient))) return true;
        // universal donor
        if (keccak256(bytes(donor)) == keccak256(bytes("O-"))) return true;
        // universal recipient
        if (keccak256(bytes(recipient)) == keccak256(bytes("AB+"))) return true;

        // O+ -> O+, A+, B+, AB+
        if (keccak256(bytes(donor)) == keccak256(bytes("O+"))) {
            return (keccak256(bytes(recipient)) == keccak256(bytes("O+")) ||
                    keccak256(bytes(recipient)) == keccak256(bytes("A+")) ||
                    keccak256(bytes(recipient)) == keccak256(bytes("B+")) ||
                    keccak256(bytes(recipient)) == keccak256(bytes("AB+")));
        }
        // A- -> A-, A+, AB-, AB+
        if (keccak256(bytes(donor)) == keccak256(bytes("A-"))) {
            return (keccak256(bytes(recipient)) == keccak256(bytes("A-")) ||
                    keccak256(bytes(recipient)) == keccak256(bytes("A+")) ||
                    keccak256(bytes(recipient)) == keccak256(bytes("AB-")) ||
                    keccak256(bytes(recipient)) == keccak256(bytes("AB+")));
        }
        // B- -> B-, B+, AB-, AB+
        if (keccak256(bytes(donor)) == keccak256(bytes("B-"))) {
            return (keccak256(bytes(recipient)) == keccak256(bytes("B-")) ||
                    keccak256(bytes(recipient)) == keccak256(bytes("B+")) ||
                    keccak256(bytes(recipient)) == keccak256(bytes("AB-")) ||
                    keccak256(bytes(recipient)) == keccak256(bytes("AB+")));
        }
        // AB- -> AB-, AB+
        if (keccak256(bytes(donor)) == keccak256(bytes("AB-"))) {
            return (keccak256(bytes(recipient)) == keccak256(bytes("AB-")) ||
                    keccak256(bytes(recipient)) == keccak256(bytes("AB+")));
        }
        // A+ -> A+, AB+
        if (keccak256(bytes(donor)) == keccak256(bytes("A+"))) {
            return (keccak256(bytes(recipient)) == keccak256(bytes("A+")) ||
                    keccak256(bytes(recipient)) == keccak256(bytes("AB+")));
        }
        // B+ -> B+, AB+
        if (keccak256(bytes(donor)) == keccak256(bytes("B+"))) {
            return (keccak256(bytes(recipient)) == keccak256(bytes("B+")) ||
                    keccak256(bytes(recipient)) == keccak256(bytes("AB+")));
        }
        // AB+ -> AB+ (already covered by exact match and universal recipient)
        return false;
    }

    // Find organ matches (blood compatibility + organ)
    function findMatchesForRecipient(uint recipientId) public view returns (Donor[] memory) {
        Recipient memory r = recipients[recipientId];
        require(r.registered, "Recipient not found");
        require(!r.matched, "Recipient already matched");

        uint count = 0;
        for (uint i = 1; i <= donorCount; i++) {
            Donor memory d = donors[i];
            if (d.registered && !d.matched && keccak256(bytes(d.organ)) == keccak256(bytes(r.organ))) {
                if (isBloodCompatible(d.bloodType, r.bloodType)) {
                    count++;
                }
            }
        }

        Donor[] memory res = new Donor[](count);
        uint idx = 0;
        for (uint i = 1; i <= donorCount; i++) {
            Donor memory d = donors[i];
            if (d.registered && !d.matched && keccak256(bytes(d.organ)) == keccak256(bytes(r.organ))) {
                if (isBloodCompatible(d.bloodType, r.bloodType)) {
                    res[idx] = d;
                    idx++;
                }
            }
        }

        return res;
    }

    // Finalize organ match
    function finalizeMatch(uint donorId, uint recipientId) public {
        Donor storage d = donors[donorId];
        Recipient storage r = recipients[recipientId];

        require(d.registered, "Donor not found");
        require(r.registered, "Recipient not found");
        require(!d.matched, "Donor already matched");
        require(!r.matched, "Recipient already matched");

        d.matched = true;
        r.matched = true;

        matchCount++;
        matches.push(Match(donorId, recipientId, block.timestamp));
        emit MatchFound(donorId, recipientId);
    }

    // Get all organ donors
    function getAllDonors() public view returns (Donor[] memory) {
        Donor[] memory list = new Donor[](donorCount);
        for (uint i = 1; i <= donorCount; i++) {
            list[i - 1] = donors[i];
        }
        return list;
    }

    // Get all organ recipients
    function getAllRecipients() public view returns (Recipient[] memory) {
        Recipient[] memory list = new Recipient[](recipientCount);
        for (uint i = 1; i <= recipientCount; i++) {
            list[i - 1] = recipients[i];
        }
        return list;
    }

    // Get all organ matches
    function getAllMatches() public view returns (Match[] memory) {
        Match[] memory list = new Match[](matchCount);
        for (uint i = 0; i < matchCount; i++) {
            list[i] = matches[i];
        }
        return list;
    }

    // ---------------- BLOOD SECTION ----------------
    struct BloodDonor {
        uint id;
        string name;
        string bloodType;
        uint age;
        string reportUrl;
        bool registered;
        bool matched;
    }

    struct BloodRecipient {
        uint id;
        string name;
        string bloodType;
        bool registered;
        bool matched;
    }

    struct BloodMatch {
        uint donorId;
        uint recipientId;
        uint timestamp;
    }

    uint public bloodDonorCount;
    uint public bloodRecipientCount;
    uint public bloodMatchCount;

    mapping(uint => BloodDonor) public bloodDonors;
    mapping(uint => BloodRecipient) public bloodRecipients;
    BloodMatch[] public bloodMatches;

    event BloodDonorRegistered(uint donorId, string name, string bloodType, string reportUrl);
    event BloodRecipientRegistered(uint recipientId, string name, string bloodType);
    event BloodMatchFound(uint donorId, uint recipientId);

    // uniqueness checks for blood flow
    function _isUniqueBloodDonor(string memory _name) internal view returns (bool) {
        for (uint i = 1; i <= bloodDonorCount; i++) {
            if (keccak256(bytes(bloodDonors[i].name)) == keccak256(bytes(_name))) return false;
        }
        return true;
    }
    function _isUniqueBloodRecipient(string memory _name) internal view returns (bool) {
        for (uint i = 1; i <= bloodRecipientCount; i++) {
            if (keccak256(bytes(bloodRecipients[i].name)) == keccak256(bytes(_name))) return false;
        }
        return true;
    }

    // Register blood donor (report required)
    function registerBloodDonor(
        string memory _name,
        string memory _bloodType,
        uint _age,
        string memory _reportUrl
    ) public {
        require(bytes(_reportUrl).length > 0, "Doctor report URL required");
        require(_isUniqueBloodDonor(_name), "Blood donor name already exists");
        bloodDonorCount++;
        bloodDonors[bloodDonorCount] = BloodDonor(
            bloodDonorCount,
            _name,
            _bloodType,
            _age,
            _reportUrl,
            true,
            false
        );
        emit BloodDonorRegistered(bloodDonorCount, _name, _bloodType, _reportUrl);
    }

    // Register blood recipient
    function registerBloodRecipient(string memory _name, string memory _bloodType) public {
        require(_isUniqueBloodRecipient(_name), "Blood recipient name already exists");
        bloodRecipientCount++;
        bloodRecipients[bloodRecipientCount] = BloodRecipient(bloodRecipientCount, _name, _bloodType, true, false);
        emit BloodRecipientRegistered(bloodRecipientCount, _name, _bloodType);
    }

    // Find blood matches (real transfusion rules)
    function findBloodMatchesForRecipient(uint recipientId) public view returns (BloodDonor[] memory) {
        BloodRecipient memory r = bloodRecipients[recipientId];
        require(r.registered, "Recipient not found");
        require(!r.matched, "Recipient already matched");

        uint count = 0;
        for (uint i = 1; i <= bloodDonorCount; i++) {
            BloodDonor memory d = bloodDonors[i];
            if (d.registered && !d.matched && isBloodCompatible(d.bloodType, r.bloodType)) {
                count++;
            }
        }

        BloodDonor[] memory res = new BloodDonor[](count);
        uint idx = 0;
        for (uint i = 1; i <= bloodDonorCount; i++) {
            BloodDonor memory d = bloodDonors[i];
            if (d.registered && !d.matched && isBloodCompatible(d.bloodType, r.bloodType)) {
                res[idx] = d;
                idx++;
            }
        }
        return res;
    }

    // Finalize blood match
    function finalizeBloodMatch(uint donorId, uint recipientId) public {
        BloodDonor storage d = bloodDonors[donorId];
        BloodRecipient storage r = bloodRecipients[recipientId];

        require(d.registered, "Blood Donor not found");
        require(r.registered, "Blood Recipient not found");
        require(!d.matched, "Blood Donor already matched");
        require(!r.matched, "Blood Recipient already matched");

        d.matched = true;
        r.matched = true;

        bloodMatchCount++;
        bloodMatches.push(BloodMatch(donorId, recipientId, block.timestamp));
        emit BloodMatchFound(donorId, recipientId);
    }

    // Get all blood donors
    function getAllBloodDonors() public view returns (BloodDonor[] memory) {
        BloodDonor[] memory list = new BloodDonor[](bloodDonorCount);
        for (uint i = 1; i <= bloodDonorCount; i++) {
            list[i - 1] = bloodDonors[i];
        }
        return list;
    }

    // Get all blood recipients
    function getAllBloodRecipients() public view returns (BloodRecipient[] memory) {
        BloodRecipient[] memory list = new BloodRecipient[](bloodRecipientCount);
        for (uint i = 1; i <= bloodRecipientCount; i++) {
            list[i - 1] = bloodRecipients[i];
        }
        return list;
    }

    // Get all blood matches
    function getAllBloodMatches() public view returns (BloodMatch[] memory) {
        BloodMatch[] memory list = new BloodMatch[](bloodMatchCount);
        for (uint i = 0; i < bloodMatchCount; i++) list[i] = bloodMatches[i];
        return list;
    }
}
