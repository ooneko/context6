import {
  dotProduct,
  magnitude,
  normalize,
  cosineSimilarity,
  euclideanDistance,
  add,
  subtract,
  scale,
  average,
  findNearestNeighbors
} from '../../src/utils/vectorMath.js';

describe('vectorMath', () => {
  describe('dotProduct', () => {
    it('should calculate dot product correctly', () => {
      expect(dotProduct([1, 2, 3], [4, 5, 6])).toBe(32);
      expect(dotProduct([1, 0], [0, 1])).toBe(0);
      expect(dotProduct([2, 3], [2, 3])).toBe(13);
    });
    
    it('should throw error for different dimensions', () => {
      expect(() => dotProduct([1, 2], [1, 2, 3])).toThrow('Vectors must have the same dimension');
    });
  });
  
  describe('magnitude', () => {
    it('should calculate magnitude correctly', () => {
      expect(magnitude([3, 4])).toBe(5);
      expect(magnitude([1, 0, 0])).toBe(1);
      expect(magnitude([0, 0, 0])).toBe(0);
      expect(magnitude([1, 1, 1])).toBeCloseTo(Math.sqrt(3), 10);
    });
  });
  
  describe('normalize', () => {
    it('should normalize vectors to unit length', () => {
      const normalized = normalize([3, 4]);
      expect(normalized[0]).toBeCloseTo(0.6, 10);
      expect(normalized[1]).toBeCloseTo(0.8, 10);
      expect(magnitude(normalized)).toBeCloseTo(1, 10);
    });
    
    it('should handle zero vectors', () => {
      const zero = [0, 0, 0];
      const normalized = normalize(zero);
      expect(normalized).toEqual([0, 0, 0]);
      expect(normalized).not.toBe(zero); // Should return a copy
    });
  });
  
  describe('cosineSimilarity', () => {
    it('should calculate cosine similarity correctly', () => {
      expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1, 10);
      expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 10);
      expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1, 10);
    });
    
    it('should handle normalized vectors', () => {
      const a = normalize([1, 2, 3]);
      const b = normalize([1, 2, 3]);
      expect(cosineSimilarity(a, b)).toBeCloseTo(1, 10);
    });
    
    it('should handle zero vectors', () => {
      expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
      expect(cosineSimilarity([0, 0], [0, 0])).toBe(0);
    });
    
    it('should throw error for different dimensions', () => {
      expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow('Vectors must have the same dimension');
    });
  });
  
  describe('euclideanDistance', () => {
    it('should calculate euclidean distance correctly', () => {
      expect(euclideanDistance([0, 0], [3, 4])).toBe(5);
      expect(euclideanDistance([1, 2], [1, 2])).toBe(0);
      expect(euclideanDistance([1, 0], [0, 1])).toBeCloseTo(Math.sqrt(2), 10);
    });
    
    it('should throw error for different dimensions', () => {
      expect(() => euclideanDistance([1, 2], [1, 2, 3])).toThrow('Vectors must have the same dimension');
    });
  });
  
  describe('add', () => {
    it('should add vectors correctly', () => {
      expect(add([1, 2], [3, 4])).toEqual([4, 6]);
      expect(add([1, -1], [1, 1])).toEqual([2, 0]);
    });
    
    it('should throw error for different dimensions', () => {
      expect(() => add([1, 2], [1, 2, 3])).toThrow('Vectors must have the same dimension');
    });
  });
  
  describe('subtract', () => {
    it('should subtract vectors correctly', () => {
      expect(subtract([3, 4], [1, 2])).toEqual([2, 2]);
      expect(subtract([1, 1], [1, 1])).toEqual([0, 0]);
    });
    
    it('should throw error for different dimensions', () => {
      expect(() => subtract([1, 2], [1, 2, 3])).toThrow('Vectors must have the same dimension');
    });
  });
  
  describe('scale', () => {
    it('should scale vectors correctly', () => {
      expect(scale([1, 2, 3], 2)).toEqual([2, 4, 6]);
      expect(scale([1, 2, 3], 0)).toEqual([0, 0, 0]);
      expect(scale([1, 2, 3], -1)).toEqual([-1, -2, -3]);
    });
  });
  
  describe('average', () => {
    it('should calculate average of vectors', () => {
      const vectors = [
        [1, 2],
        [3, 4],
        [5, 6]
      ];
      expect(average(vectors)).toEqual([3, 4]);
    });
    
    it('should handle single vector', () => {
      expect(average([[1, 2, 3]])).toEqual([1, 2, 3]);
    });
    
    it('should throw error for empty array', () => {
      expect(() => average([])).toThrow('Cannot average empty array of vectors');
    });
    
    it('should throw error for different dimensions', () => {
      const vectors = [
        [1, 2],
        [3, 4, 5]
      ];
      expect(() => average(vectors)).toThrow('All vectors must have the same dimension');
    });
  });
  
  describe('findNearestNeighbors', () => {
    const vectors = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
      [0.9, 0.1, 0],
      [0.1, 0.9, 0]
    ];
    
    it('should find nearest neighbors using cosine distance', () => {
      const query = [1, 0, 0];
      const neighbors = findNearestNeighbors(query, vectors, 3, 'cosine');
      
      expect(neighbors).toHaveLength(3);
      expect(neighbors[0].index).toBe(0); // Exact match
      expect(neighbors[0].distance).toBeCloseTo(0, 10);
      expect(neighbors[1].index).toBe(3); // Close match
    });
    
    it('should find nearest neighbors using euclidean distance', () => {
      const query = [1, 0, 0];
      const neighbors = findNearestNeighbors(query, vectors, 2, 'euclidean');
      
      expect(neighbors).toHaveLength(2);
      expect(neighbors[0].index).toBe(0); // Exact match
      expect(neighbors[0].distance).toBe(0);
    });
    
    it('should handle k larger than vector count', () => {
      const query = [1, 0, 0];
      const neighbors = findNearestNeighbors(query, vectors, 10, 'cosine');
      
      expect(neighbors).toHaveLength(vectors.length);
    });
    
    it('should default to cosine metric', () => {
      const query = [1, 0, 0];
      const neighbors1 = findNearestNeighbors(query, vectors, 3);
      const neighbors2 = findNearestNeighbors(query, vectors, 3, 'cosine');
      
      expect(neighbors1).toEqual(neighbors2);
    });
  });
});