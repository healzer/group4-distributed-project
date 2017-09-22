FROM node:4-onbuild

# Create test directory
RUN mkdir -p /usr/src/test
WORKDIR /usr/src/test

# Install test dependencies
COPY package.json /usr/src/test/
RUN npm install

# Bundle test source
COPY . /usr/src/test

CMD [ "npm", "start" ]

