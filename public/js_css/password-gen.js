function encode(s) {
    var out = [];
    for (var i=0; i<s.length; i++){
      out[i] = s.charCodeAt(i);
    }
    return new Uint8Array(out);
  }
  
  function vigenere_encrypt(word, inpkey) {
    var key = inpkey
    var crypt = ".#ve"
    
    for (var i=0;i<word.length;i++) {
      var asciicode = word.charCodeAt(i)+key.charCodeAt(i%key.length)
      while (asciicode<32) {
        asciicode += 93
      }
      while (asciicode>125) {
        asciicode -= 93
      }
      crypt+=String.fromCharCode(asciicode)
    }
    
    return crypt
  }
  
  
  function vigenere_decrypt(word, inpkey) {
    var key = inpkey || "Super-Elefanten-Glukose-Schleuder"
    var crypt = ""
    word = word.substr(4)
    
    for (var i=0;i<word.length;i++) {
      var asciicode = word.charCodeAt(i)-key.charCodeAt(i%key.length)
      while (asciicode<32) {
        asciicode += 93
      }
      while (asciicode>125) {
        asciicode -= 93
      }
      crypt+=String.fromCharCode(asciicode)
    }
    
    return crypt
  }
  
  // okay, hey Tobi, die scheiße hier tut mir wirklich, wirklich leid. Aber habe Bock zu zocken, außerdem ist es spät...
  class passwordGenerator {
    constructor() {

      // Get password pool
      this.greekAlphabet = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon",
                           "Zeta", "Eta", "Theta", "Iota", "Kappa", "Lambda",
                           "My", "Ny", "Xi", "Omikron", "Pi", "Rho", "Sigma",
                           "Tau", "Ypsilon", "Phi", "Chi", "Psi", "Omega"]

      this.egyptGods = ["Ra", "Geb", "Nut", "Shu", "Osiris", "Isis", "Set",
                       "Horus", "Bast", "Sobek", "Serqet", "Anubis", "Bes",
                       "Khonsu", "Nekhbet", "Babi", "Tawaret"]

      /*this.worldWonders = ["Die hängenden Gärten der Semiramis zu Babylon",
                          "Der Koloss von Rhodos",
                          "Das Grab des Königs Mausolos II. zu Halikarnassos",
                          "Der Leuchtturm auf der Insel Pharos vor Alexandria",
                          "Die Pyramiden von Gizeh in Ägypten", 
                          "Der Tempel der Artemis in Ephesos", 
                          "Die Zeusstatue des Phidias von Olympia"]*/
      this.worldWonders = ["HGB", "KVR", "GKM", "LVA", "PGA", "TAE", "ZSO"]
      
      this.password = ""
    }
    
    setValues(infos) {
      let {acc, key, pin, min, max, spec, comp, year, type} = infos
      this.accVal=acc
      this.keyVal=vigenere_decrypt(key)
      this.keyNormVal=vigenere_decrypt(key)
      this.pinNum=parseInt(vigenere_decrypt(pin))
      this.minNum=parseInt(min)
      this.maxNum=parseInt(max)
      this.charVal=spec
      this.compVal=comp
      this.yearNum=parseInt(year)
      this.typeNum=parseInt(type)
      this.typeNormNum=parseInt(type)

      this.accLen = this.accVal.length
      this.keyLen = this.keyVal.length
      this.keyNormLen = this.keyNormVal.length
      this.charLen = this.charVal.length
      this.compLen = this.compVal.length

      this.accAsc = passwordGenerator.asciiAddition(this.accVal)
      this.keyAsc = passwordGenerator.asciiAddition(this.keyVal)
      this.charAsc = passwordGenerator.asciiAddition(this.charVal)
      this.compAsc = passwordGenerator.asciiAddition(this.compVal)
      
      if (this.maxNum>=16) {
        this.isWW = true
      }else{
        this.isWW = false
      }
    }
    
    secure() {
      this.password = this.getCompLetter() + "_" + this.getSpecialChar() + passwordGenerator.asciiAddition(this.keyNormVal) + this.getKeyLetter()
      return this.password
    }
    
    superSecure() {

      // Range[absoluteMin, absolutMax, nowMin, nowMax]
      // Ranges[greekRange, egyptRange, specialRange, romanRnage]
      this.Ranges = [[2, 7, 2, 7], [3, 7, 2, 7], [0, 2, 0, 2], [0, 5, 0, 5]]
      var n = 0

      // After 20 tries no password will found -> Standart PW
      while (n<20) {
        n++
        for (var i=0;i<this.Ranges.length;i++) {
          this.password = this.calcSyntax()
          
          if (this.password.length<=this.maxNum&&this.password.length>=this.minNum) {
            n = 20
            return this.password
          }
          var exLen = this.calcExtremLengths(),
              maxPossibleLength = exLen[0],
              minPossibleLength = exLen[1]

          var changableRange = this.Ranges[i]
          if ((this.password.length>this.maxNum||minPossibleLength>this.maxNum)&&changableRange[3]>changableRange[0]&&changableRange[3]>changableRange[2]) {
            changableRange[3]--
          }else if ((this.password.length<this.minNum||maxPossibleLength<this.minNum)&&changableRange[2]<changableRange[1]&&changableRange[3]>changableRange[2]) {
            changableRange[2]++
          }
        }
      }
    }
    
    getCompLetter() {
      if (this.compLen<=5) {
        return "Alpha"
      }else if (this.compLen<=7) {
        return "Beta"
      }else if (this.compLen<=9) {
        return "Gamma"
      }else if (this.compLen<=14) {
        return "Delta"
      }else{
        return "Omega"
      }
    }
    
    getSpecialChar() {
      switch(this.typeNormNum){
        case 1:
          return "!"
        case 2:
          return "@"
        case 3:
          return "%"
        case 4:
          return "$"
        case 5:
          return "&"
        default:
          return "&"
      }
    }
    
    getKeyLetter() {
      if (this.keyNormLen<=3) {
        return "Epsilon"
      }else if (this.keyNormLen<=5) {
        return "Zeta"
      }else if (this.keyNormLen<=8) {
        return "Eta"
      }else if (this.keyNormLen<=11) {
        return "Theta"
      }else{
        return "Psi"
      }
    }
    
    getGreekLetter() {
      var pool = [],
          Ranges = this.Ranges
      this.greekAlphabet.forEach(function(letter){
        if (letter.length>=Ranges[0][2]&&letter.length<=Ranges[0][3]) {
          pool[pool.length] = letter
        }})
      var vals = [this.compAsc*this.accAsc, this.compLen*this.keyAsc, this.keyAsc*this.pinNum, this.accLen*this.keyLen]
      var greekIndex = Math.round((pool.length-1)*passwordGenerator.getIndexMultiplier(vals))
      var greekLetter = pool[greekIndex]
      return greekLetter
    }
    
    getEgyptGod() {
      var pool = [],
          Ranges = this.Ranges
      this.egyptGods.forEach(function(god){
        if (god.length>=Ranges[1][2]&&god.length<=Ranges[1][3]) {
          pool[pool.length] = god
        }})
      var vals = [this.compAsc*this.keyAsc, this.compLen*this.pinNum, this.accAsc*this.pinNum, this.accLen*this.keyLen]
      var egyptIndex = Math.round((pool.length-1)*passwordGenerator.getIndexMultiplier(vals))
      var egyptGod = pool[egyptIndex]
      return egyptGod
    }
    
    getSpecials() {
      if (this.charLen!=0) {
        var specialOneIndex = (this.typeNum+1)%this.charLen
        var specialTwoIndex = (1+this.typeNum*2)%this.charLen
        if (this.Ranges[2][3]==2) {
          return this.charVal[specialOneIndex]+this.charVal[specialTwoIndex]
        }else if (this.Ranges[2][3]==1) {
          return this.charVal[specialOneIndex]
        }else{
          return ""
        }
      }else{
        return ""
      }
    }
    
    getRomanNumber() {
      if (this.Ranges[3][3]==5) {
        return passwordGenerator.romanize(this.pinNum%28+1)
      }else if (this.Ranges[3][3]==4) {
        return passwordGenerator.romanize(this.pinNum%18+1)
      }else if (this.Ranges[3][3]==3) {
        return passwordGenerator.romanize(this.pinNum%8+1)
      }else if (this.Ranges[3][3]==2) {
        return passwordGenerator.romanize(this.pinNum%2+1)
      }else if (this.Ranges[3][3]==1) {
        return passwordGenerator.romanize(1)
      }else{
        return ""
      }
    }
    
    getWorldWonder() {
      if (this.isWW) {
        return this.worldWonders[(this.pinNum+this.typeNum+this.compLen+this.accAsc)%this.worldWonders.length]
      }else{
        return ""
      }
    }
    
    calcSyntax() {
      var greekLetter = this.getGreekLetter()
      var egyptGod = this.getEgyptGod()
      var numbers = (this.pinNum*this.keyLen)%999
      var specialLetters = this.getSpecials()
      var romanNumber = this.getRomanNumber()
      var worldWonder = this.getWorldWonder()
      switch(this.yearNum%3) {
        case 3:
          return greekLetter+specialLetters+worldWonder+numbers+egyptGod+romanNumber
        case 2:
          return egyptGod+worldWonder+numbers+greekLetter+specialLetters+romanNumber
        case 1:
          return greekLetter+specialLetters+worldWonder+numbers+egyptGod+romanNumber
        case 0:
          return egyptGod+worldWonder+numbers+greekLetter+specialLetters+romanNumber
        default:
          return greekLetter+specialLetters+worldWonder+numbers+egyptGod+romanNumber
      }
    }
    
    calcExtremLengths() {
      var maxPossibleLength,
          minPossibleLength
      if (this.isWW) {
        minPossibleLength += 6
        maxPossibleLength += 6
      }else{
        minPossibleLength += 3
        maxPossibleLength += 3
      }
      this.Ranges.forEach(function(myrange) {
        minPossibleLength += myrange[2]
        maxPossibleLength += myrange[3]
      })
      return [maxPossibleLength, minPossibleLength]
    }
    
    static asciiAddition(word) {
      var count = 0
      for(var i=0; i<word.length; i++) {
        count+=word.charCodeAt(i)
      }
      return count
    }
    
    static getIndexMultiplier(values) {
      var multipl = 1/values.length,
          sum = 0
      values.forEach(function(val) {
        sum += parseFloat(val)
      })
      return multipl*(sum%(100/multipl)/100)
    }
    
    static romanize (num) {
      if (isNaN(num))
          return NaN;
      var digits = String(+num).split(""),
          key = ["","C","CC","CCC","CD","D","DC","DCC","DCCC","CM",
                 "","X","XX","XXX","XL","L","LX","LXX","LXXX","XC",
                 "","I","II","III","IV","V","VI","VII","VIII","IX"],
          roman = "",
          i = 3;
      while (i--)
          roman = (key[+digits.pop() + (i * 10)] || "") + roman;
      return Array(+digits.join("") + 1).join("M") + roman;
    }
    
    static deromanize (str) {
      var	str = str.toUpperCase(),
        validator = /^M*(?:D?C{0,3}|C[MD])(?:L?X{0,3}|X[CL])(?:V?I{0,3}|I[XV])$/,
        token = /[MDLV]|C[MD]?|X[CL]?|I[XV]?/g,
        key = {M:1000,CM:900,D:500,CD:400,C:100,XC:90,L:50,XL:40,X:10,IX:9,V:5,IV:4,I:1},
        num = 0, m;
      if (!(str && validator.test(str)))
        return false;
      while (m = token.exec(str))
        num += key[m[0]];
      return num;
    }
  }