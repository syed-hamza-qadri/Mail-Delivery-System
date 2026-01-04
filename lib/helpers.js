// Helper function to merge template variables
function mergeTemplate(template, variables) {
  let mergedSubject = template.subject;
  let mergedBody = template.body;

  Object.keys(variables).forEach((key) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    mergedSubject = mergedSubject.replace(regex, variables[key]);
    mergedBody = mergedBody.replace(regex, variables[key]);
  });

  return { subject: mergedSubject, body: mergedBody };
}

module.exports = { mergeTemplate };
