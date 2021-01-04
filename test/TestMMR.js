const MMRWrapper = artifacts.require('MMRWrapper');
const MMR = artifacts.require('MMR');
const chai = require('chai');
chai.use(require('chai-bn')(web3.utils.BN));
chai.use(require('chai-as-promised'));
chai.should();

contract('MerkleMountainRange', async () => {
  let mmrLib;
  let res;
  before(async () => {
    mmrLib = await MMR.new();
    await MMRWrapper.link('MMR', mmrLib.address);
    console.log('MMR Tree : 5 |                             31');
    console.log('           4 |             15                                 30                                    46');
    console.log('           3 |      7             14                 22                 29                 38                 45');
    console.log('           2 |   3      6     10       13       18       21        25       28        34        37       41        44       49');
    console.log('           1 | 1  2   4  5   8  9    11  12   16  17    19  20   23  24    26  27   32  33    35  36   39  40    42  43   47  48    50');
    console.log('       width | 1  2   3  4   5  6     7   8    9  10    11  12   13  14    15  16   17  18    19  20   21  22    23  24   25  26    27');
  });
  context('Test pure functions', async () => {
    describe('getChildren()', async () => {
      it('should return 1,2 as children for 3', async () => {
        res = await mmrLib.getChildren(3);
        res.left.should.be.a.bignumber.that.equals('1');
        res.right.should.be.a.bignumber.that.equals('2');
      });
      it('should return 3,6 as children for 7', async () => {
        res = await mmrLib.getChildren(7);
        res.left.should.be.a.bignumber.that.equals('3');
        res.right.should.be.a.bignumber.that.equals('6');
      });
      it('should return 22,29 as children for 30', async () => {
        res = await mmrLib.getChildren(30);
        res.left.should.be.a.bignumber.that.equals('22');
        res.right.should.be.a.bignumber.that.equals('29');
      });
      it('should be reverted for leaves like 1,2,4', async () => {
        await mmrLib.getChildren(1).should.be.rejected;
        await mmrLib.getChildren(2).should.be.rejected;
        await mmrLib.getChildren(4).should.be.rejected;
      });
    });
    describe('getPeakIndexes()', async () => {
      it('should return [15, 22, 25] for a mmr which width is 14', async () => {
        res = await mmrLib.getPeakIndexes(14);
        res[0].should.be.a.bignumber.that.equals('15');
        res[1].should.be.a.bignumber.that.equals('22');
        res[2].should.be.a.bignumber.that.equals('25');
      });
      it('should return [3] for a mmr which width is 2', async () => {
        res = await mmrLib.getPeakIndexes(2);
        res[0].should.be.a.bignumber.that.equals('3');
      });
      it('should return [31, 46, 49, 50] for a mmr which width is 27', async () => {
        res = await mmrLib.getPeakIndexes(27);
        res[0].should.be.a.bignumber.that.equals('31');
        res[1].should.be.a.bignumber.that.equals('46');
        res[2].should.be.a.bignumber.that.equals('49');
        res[3].should.be.a.bignumber.that.equals('50');
      });
    });
    describe('hashBranch()', async () => {
      it('should return sha3(left,right)', async () => {
        let left = web3.utils.soliditySha3(1, '0x00'); // At 1
        let right = web3.utils.soliditySha3(2, '0x00'); // At 2
        res = await mmrLib.hashParent(left, right);
        res.should.equal(web3.utils.soliditySha3(left, right));
      });
    });
    describe('mountainHeight()', async () => {
      it('should return 3 for its highest peak when the size is less than 12 and greater than 4', async () => {
        for (let i = 5; i < 12; i++) {
          (await mmrLib.mountainHeight(i)).should.be.a.bignumber.that.equals('3');
        }
      });
      it('should return 4 for its highest peak when the size is less than 27 and greater than 11', async () => {
        for (let i = 12; i < 27; i++) {
          (await mmrLib.mountainHeight(i)).should.be.a.bignumber.that.equals('4');
        }
      });
    });
    describe('heightAt()', async () => {
      let firstFloor = [1, 2, 4, 5, 8, 9, 11, 12, 16, 17, 19, 20, 23, 24, 26, 27, 32, 33, 35, 36, 39, 40, 42, 43, 47, 48];
      let secondFloor = [3, 6, 10, 13, 18, 21, 25, 28, 34, 37, 41, 44, 49];
      let thirdFloor = [7, 14, 22, 29, 38, 45];
      let fourthFloor = [15, 30, 46];
      let fifthFloor = [31];
      it('should return 1 as the height of the index which belongs to the first floor', async () => {
        for (let index of firstFloor) {
          (await mmrLib.heightAt(index)).should.be.a.bignumber.that.equals('1');
        }
      });
      it('should return 2 as the height of the index which belongs to the second floor', async () => {
        for (let index of secondFloor) {
          (await mmrLib.heightAt(index)).should.be.a.bignumber.that.equals('2');
        }
      });
      it('should return 3 as the height of the index which belongs to the third floor', async () => {
        for (let index of thirdFloor) {
          (await mmrLib.heightAt(index)).should.be.a.bignumber.that.equals('3');
        }
      });
      it('should return 4 as the height of the index which belongs to the fourth floor', async () => {
        for (let index of fourthFloor) {
          (await mmrLib.heightAt(index)).should.be.a.bignumber.that.equals('4');
        }
      });
      it('should return 5 as the height of the index which belongs to the fifth floor', async () => {
        for (let index of fifthFloor) {
          (await mmrLib.heightAt(index)).should.be.a.bignumber.that.equals('5');
        }
      });
    });
  });

  context('MMR verification', async () => {
    describe('inclusionProof()', async () => {
      let leafHashes = [
        '0xe8e77626586f73b955364c7b4bbf0bb7f7685ebd40e852b164633a4acbd3244c', // 0
        '0xe37890bf230cf36ea140a5dbb9a561aa7ef84f8f995873db8386eba4a95c7bbe', // 1
        '0x2b97a4b75a93aa1ac8581fac0f7d4ab42406569409a737bdf9de584903b372c5', // 2
        '0xa4a7208a40e95acaf2fe1a3c675b1b5d8c341060e4f179b76ba79493582a95a6', // 3
        '0x989a7025bda9312b19569d9e84e33a624e7fc007e54db23b6758d5f819647071', // 4
        '0xd279eb4bf22b2aeded31e65a126516215a9d93f83e3e425fdcd1a05ab347e535', // 5
        '0x291bd553ea938a33785762f076cbad142bde4a0caf55fbf122ac07d7489414ed' // 6
      ];

      before(async () => {
        mmr = await MMRWrapper.new();
        for (let i = 0; i < leafHashes.length; i++) {
          await mmr.append(leafHashes[i]);
        }
      });

      it('should return pass true when it receives a valid merkle proof', async () => {
        let index = 5;
        let value = leafHashes[index];

        res = await mmr.getMerkleProof.call(index);

        console.log('root:', res.root);
        console.log('width:', Number(res.width));
        console.log('peak bagging:', res.peakBagging);
        console.log('siblings:', res.siblings);

        await mmrLib.inclusionProof(res.root, Number(res.width), index, value, res.peakBagging, res.siblings).should.eventually.equal(true);
      });

      // it('should revert when it receives an invalid merkle proof', async () => {
      //   let index = 5;
      //   res = await mmr.getMerkleProof(index);
      //   // Stored value is 0x0000 not 0x0001
      //   await mmrLib.inclusionProof(res.root, res.width, index, '0x0001', res.peakBagging, res.siblings).should.be.rejected;
      // });
    });
  });
});

// TODO: Data from Vincent:

// let proof = {
//   leafHash: "0xc09d4a008a0f1ef37860bef33ec3088ccd94268c0bfba7ff1b3c2a1075b0eb92",
//   leafIndex: 5,
//   leafCount: 7,
//   items: [
//       "0xe53ee36ba6c068b1a6cfef7862fed5005df55615e1c9fa6eeefe08329ac4b94b",
//       "0x99af07747700389aba6e6cb0ee5d553fa1241688d9f96e48987bca1d7f275cbe",
//       "0xaf3327deed0515c8d1902c9b5cd375942d42f388f3bfe3d1cd6e1b86f9cc456c"
//   ]
// }

// let leafHashes = [
// "0xc3e7ba6b511162fead58f2c8b5764ce869ed1118011ac37392522ed16720bbcd",
// "0x037ff5a3903a59630e03b84cda912c26bf19442efe2cd30c2a25547e06ded385",
// "0xffb0ad2811094c7f63826e33b6d7b3afa72587be856a86f10e3d0d869bbc37e5",
// "0xf47e991c124932a8573f782e1bc2fa62f628f8e1e074e6193170b0e302e37421",
// "0xd2ad83af7d5b0387eb704e57f4539138df402d72704fb74fde7a33353fab598d",
// "0xe232c7350837c9d87a948ddfc4286cc49d946e8cdad9121e91595f190ed7e54d", // or 0xc09d4a008a0f1ef37860bef33ec3088ccd94268c0bfba7ff1b3c2a1075b0eb92
// "0x32d44b4a8e8a3046b9c02315847eb091678a59f136226e70d66f3a82bd836ce1"
// ];

// let interiorHashes = [
// "0xbc54778fab79f586f007bd408dca2c4aa07959b27d1f2c8f4f2549d1fcfac8f8",
// "0x00b0046bd2d63fcb760cf50a262448bb2bbf9a264b0b0950d8744044edf00dc3",
// "0xe53ee36ba6c068b1a6cfef7862fed5005df55615e1c9fa6eeefe08329ac4b94b",
// "0xdad09f50b41822fc5ecadc25b08c3a61531d4d60e962a5aa0b6998fad5c37c5e"
// ];

// let peakHashes = [
// "0xda5e6d0616e05c6a6348605a37ca33493fc1a15ad1e6a405ee05c17843fdafed",
// "0x99af07747700389aba6e6cb0ee5d553fa1241688d9f96e48987bca1d7f275cbe",
// "0xaf3327deed0515c8d1902c9b5cd375942d42f388f3bfe3d1cd6e1b86f9cc456c"
// ];

// let rootHash = "0xfc4f9042bd2f73feb26f3fc42db834c5f1943fa20070ddf106c486a478a0d561";
