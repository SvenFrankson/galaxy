interface IIJK {
    i: number;
    j: number;
    k: number;
}

class IJK {

    public static IJK(iijk: IIJK) {
        return new IJK(iijk.i, iijk.j, iijk.k);
    }
    
    constructor(
        public i: number,
        public j: number,
        public k: number
    ) {

    }

    public isEqual(other: IJK): boolean {
        return this.i === other.i && this.j === other.j && this.k === other.k;
    }

    public isTile(): boolean {
        let odds = 0;
        if (this.i % 2 === 1) {
            odds++;
        }
        if (this.j % 2 === 1) {
            odds++;
        }
        if (this.k % 2 === 1) {
            odds++;
        }
        return odds === 2;
    }

    public forEachAround(callback: (ijk: IJK) => void): void {
        callback(new IJK(this.i - 1, this.j, this.k));
        callback(new IJK(this.i, this.j - 1, this.k));
        callback(new IJK(this.i, this.j, this.k - 1));
        callback(new IJK(this.i + 1, this.j, this.k));
        callback(new IJK(this.i, this.j + 1, this.k));
        callback(new IJK(this.i, this.j, this.k + 1));
    }
}