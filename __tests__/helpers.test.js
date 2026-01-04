const { mergeTemplate } = require('../lib/helpers');

describe('Template Merge Helper', () => {
  test('should merge simple variables into subject and body', () => {
    const template = {
      subject: 'Hello {{name}}',
      body: '<p>Welcome {{name}}, your email is {{email}}</p>',
    };
    const variables = {
      name: 'John',
      email: 'john@example.com',
    };

    const result = mergeTemplate(template, variables);

    expect(result.subject).toBe('Hello John');
    expect(result.body).toBe(
      '<p>Welcome John, your email is john@example.com</p>'
    );
  });

  test('should handle multiple occurrences of same variable', () => {
    const template = {
      subject: '{{name}} {{name}}',
      body: '<p>{{name}} {{name}} {{name}}</p>',
    };
    const variables = {
      name: 'Alice',
    };

    const result = mergeTemplate(template, variables);

    expect(result.subject).toBe('Alice Alice');
    expect(result.body).toBe('<p>Alice Alice Alice</p>');
  });

  test('should handle missing variables gracefully', () => {
    const template = {
      subject: 'Hello {{name}}',
      body: '<p>Your ID is {{id}}</p>',
    };
    const variables = {
      name: 'Bob',
    };

    const result = mergeTemplate(template, variables);

    expect(result.subject).toBe('Hello Bob');
    expect(result.body).toBe('<p>Your ID is {{id}}</p>'); // Variable not replaced
  });

  test('should return unchanged template with empty variables', () => {
    const template = {
      subject: 'Test Subject',
      body: '<p>Test Body</p>',
    };
    const variables = {};

    const result = mergeTemplate(template, variables);

    expect(result.subject).toBe('Test Subject');
    expect(result.body).toBe('<p>Test Body</p>');
  });

  test('should handle special characters in variables', () => {
    const template = {
      subject: 'Hello {{name}}',
      body: '<p>Email: {{email}}</p>',
    };
    const variables = {
      name: "O'Brien",
      email: 'user+tag@example.com',
    };

    const result = mergeTemplate(template, variables);

    expect(result.subject).toBe("Hello O'Brien");
    expect(result.body).toBe('<p>Email: user+tag@example.com</p>');
  });
});
