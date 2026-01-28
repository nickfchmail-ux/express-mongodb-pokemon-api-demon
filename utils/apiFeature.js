class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((el) => delete queryObj[el]);

    let queryStr = JSON.stringify(queryObj);

    const replacedStr = queryStr.replace(
      /\b(gte|gt|lte|lt|ne|in|nin)\b/g,
      (match) => `$${match}`,
    );

    let mongoFilter = {};

    const parsedObj = JSON.parse(queryStr);
    Object.keys(queryObj).forEach((key) => {
      const value = queryObj[key];
      if (key.includes('_')) {
        const [field, operator] = key.split('_');
        const op = `$${operator}`; // $gte, $lte, etc.

        if (!mongoFilter[field]) {
          mongoFilter[field] = {};
        }

        if (field === 'species') {
          const speciesInput = value.split(',');
          mongoFilter[field][op] = speciesInput; // convert numbers when possible
        } else {
          mongoFilter[field][op] = Number(value) || value; // convert numbers when possible
        }
      } else {
        // simple equal: ?type=fire → type: 'fire'
        mongoFilter[key] = value;
      }
    });

    this.query = this.query.find(mongoFilter);

    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-attack');
    }
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }

  paginate() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 100;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);
    return this;
  }
}

export default APIFeatures;
