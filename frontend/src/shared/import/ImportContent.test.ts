import { findColumns, findSeparator, retrieveColumns } from './ImportContent';

describe('ImportContent', () => {
  describe('txt/csv', () => {
    it('findSeparator commas', () => {
      expect(
        findSeparator(`
      "25/12/2022","Hello, World","Xasd", 1234
      "26/12/2022","Hello, World","Xasd",3213
      "28/12/2022","Hello, World","Xasd",52.34
      `)
      ).toEqual(',');
    });

    it('findSeparator tabs', () => {
      expect(
        findSeparator(`
      "25/12/2022"\t"Hello, World"\t"Xasd"\t 12.34
      "26/12/2022"\t"Hello, World"\t"Xasd"\t 123.4
      "28/12/2022"\t"Hello, World"\t"Xasd"\t 1.234
      `)
      ).toEqual('\t');
    });

    it('findSeparator colons', () => {
      expect(
        findSeparator(`
      PIX TRANSF  XXXX07/05:-87,00:09/05/2022
      INT CREDIT MC:-18,00:09/05/2022
      PHONE SERVICE:-29,11:09/05/2022
      `)
      ).toEqual(':');
    });

    it('findSeparator semi-colons', () => {
      expect(
        findSeparator(`
      09/05/2022;PIX TRANSF  XXXX07/05;-87,00
      09/05/2022;INT CREDIT MC;-18,00
      09/05/2022;PHONE SERVICE;-29,11
      `)
      ).toEqual(';');
    });

    it('findColumns with dd/MM/yyyy and dot decimal separator', () => {
      expect(findColumns(['Hello World', '23.11', '23/12/2022'], 'dd/MM/yyyy')).toEqual({
        valueIndex: 1,
        dateIndex: 2,
      });
    });

    it('findColumns with MM-dd-yyyy and comma decimal separator', () => {
      expect(findColumns(['23,11', 'Hello World', '12-23-2022', 'other', 'useless', 'data'], 'MM-dd-yyyy')).toEqual({
        valueIndex: 0,
        dateIndex: 2,
      });
    });

    it('findColumns no amount', () => {
      expect(findColumns(['Hello World', 'not an amount', '23/12/2022'], 'dd/MM/yyyy')).toEqual({
        valueIndex: -1,
        dateIndex: 2,
      });
    });

    it('findColumns no date', () => {
      expect(findColumns(['Hello World', '42,69', '23x12x2022'], 'dd/MM/yyyy')).toEqual({
        valueIndex: 1,
        dateIndex: -1,
      });
    });

    it('findColumns unrelated number', () => {
      expect(
        findColumns(['Hello World', 'I helped 123,87 friends to do 321.98 things', '42,69', '23/12/2022'], 'dd/MM/yyyy')
      ).toEqual({
        valueIndex: 2,
        dateIndex: 3,
      });
    });

    it('retrieve columns', () => {
      const indexes = {
        valueIndex: 1,
        dateIndex: 2,
      };
      expect(
        retrieveColumns(['Hello World', '42,69', '23/12/2022', 'something', '123141', 'else'], indexes, 'dd/MM/yyyy')
      ).toEqual({
        value: 42.69,
        date: '2022-12-23',
        other: ['Hello World', 'something', '123141', 'else'],
      });
    });
  });
});
